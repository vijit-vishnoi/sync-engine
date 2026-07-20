package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"
	"strings"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
	"github.com/vijit-vishnoi/internal/crdt"
	"github.com/vijit-vishnoi/internal/executor"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	forward	   chan []byte
	register   chan *Client
	unregister chan *Client
	document *crdt.Document
	collection *mongo.Collection
	needsSaving bool 
	roomId string
	executor executor.CodeExecutor
	LastExuecution time.Time
	redisClient *redis.Client
	ctx context.Context
}

type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
	SiteID string 
	DisplayName string 
}
type SyncMessage struct{
	Type string `json:"type"`
	Char crdt.Char `json:"char,omitempty"`
	FullDoc []crdt.Char `json:"fullDoc,omitempty"`
	SenderId string `json:"senderId,omitempty"`
	LineNumber int `json:"lineNumber,omitempty"`
	Column int `json:"column,omitempty"`
	DisplayName string	`json:"displayName,omitempty"`
	LanguageID int `json:"languageId,omitempty"`
	Output string `json:"output,omitempty"`
	ActiveUsers map[string]string `json:"activeUsers"`
}

type MongoDocument struct{
	ID string `bson:"_id"`
	Chars []crdt.Char `bson:"chars"`
}

func NewHub(collection *mongo.Collection,roomId string,exec executor.CodeExecutor) *Hub{
	rdb:=redis.NewClient(&redis.Options{
		Addr: "127.0.0.1:6379",
	})
	h:=&Hub{
		register: make(chan *Client),
		unregister: make(chan *Client),
		clients: make(map[*Client]bool),
		broadcast: make(chan []byte),
		forward: make(chan []byte),
		document: &crdt.Document{},
		collection: collection,
		roomId: roomId,
		executor:exec,
		redisClient: rdb,
		ctx: context.Background(),
	}
	h.loadDocument()

	go h.subscribeToReddis()

	return h
}

func (h *Hub)subscribeToReddis(){
	pubsub:=h.redisClient.Subscribe(h.ctx,"room:"+h.roomId)
	defer pubsub.Close()

	ch:=pubsub.Channel()

	for msg:=range ch{
		h.broadcast<-[]byte(msg.Payload)
	}
}

func (h *Hub)publishPresenceState(){
	members,err:=h.redisClient.ZRange(h.ctx,"room_presence:"+h.roomId,0,-1).Result()
	if err==nil{
		users:=make(map[string]string)
		for _, member:=range members{
			parts:=strings.Split(member,"|")
			if len(parts)==2{
				users[parts[0]]=parts[1]
			}
		}
		msg:=SyncMessage{
			Type:	"presence_state",
			ActiveUsers:users,
		}
		bytes,_:=json.Marshal(msg)
		h.redisClient.Publish(h.ctx,"room:"+h.roomId,bytes)
	}
}

func (h *Hub)Run(){
	ticker:=time.NewTicker(5*time.Second)
	defer ticker.Stop()
	for{
		select {
		case client:=<-h.register:
			h.clients[client]=true;
			initMsg:=SyncMessage{
				Type:"init",
				FullDoc: h.document.Chars,
			}
			initBytes,err:=json.Marshal(initMsg)
			if err==nil{
				client.send<-initBytes
			}
			if client.SiteID!=""{
				member:=client.SiteID+"|"+client.DisplayName
				h.redisClient.ZAdd(h.ctx,"room_users:"+h.roomId,redis.Z{
					Score:float64(time.Now().Unix()),
					Member: member,
				})
			}
			h.publishPresenceState()
		case client:=<-h.unregister:
			if _,ok:=h.clients[client];ok{
				delete(h.clients,client)
				close(client.send)
				if client.SiteID!=""{
					member:=client.SiteID+"|"+client.DisplayName
					h.redisClient.ZRem(h.ctx,"room_users:"+h.roomId,member)
				}
				h.publishPresenceState()
			}
			 
		case message:=<-h.forward:
			var syncMsg SyncMessage
			err:=json.Unmarshal(message,&syncMsg)
			if err==nil{
				if syncMsg.Type == "heartbeat" {
                    member := syncMsg.SenderId + "|" + syncMsg.DisplayName
                    h.redisClient.ZAdd(h.ctx, "room_presence:"+h.roomId, redis.Z{
                        Score:  float64(time.Now().Unix()),
                        Member: member,
                    })
                    continue 
                }
				if syncMsg.Type=="execute"{
					if time.Since(h.LastExuecution)<2*time.Second{
						errMssg:=SyncMessage{
							Type:"terminal_output",
							Output:"System: Cooldown active. Please wait 2 seconds before running again.",
						}
						errBytes,marshalErr:=json.Marshal(errMssg)
						if marshalErr==nil{
							h.redisClient.Publish(h.ctx, "room:"+h.roomId, errBytes)
						}
						continue
					}
					h.LastExuecution=time.Now()
					codeString:=h.document.ToString()
					result,err:=h.executor.Execute(codeString,syncMsg.LanguageID)
					if err!=nil{
						fmt.Println(err)
					}
					outputMsg:=SyncMessage{
						Type:"terminal_output",
						Output: result,
					}
					outputBytes,marshalErr:=json.Marshal(outputMsg)
					if marshalErr==nil{
						h.redisClient.Publish(h.ctx,"room:"+h.roomId,outputBytes)
					}		
			}else{
				h.redisClient.Publish(h.ctx,"room:"+h.roomId,message)
			}
		} else{
			log.Println("Error parsing message:",err)
		}

		case message := <-h.broadcast:
		var syncMsg SyncMessage
		err := json.Unmarshal(message, &syncMsg)
		if err == nil {
			switch syncMsg.Type {
			case "insert":
				h.document.Insert(syncMsg.Char)
				h.needsSaving = true
			case "delete":
				h.document.Delete(syncMsg.Char)
				h.needsSaving = true
			}
		} else {
			log.Println("Error parsing broadcast message:", err)
		}
		
		for client:=range h.clients{
			select {
			case client.send<-message:
			default:
				close(client.send)
				delete(h.clients,client)
			}
		}
		case <-ticker.C:
			if h.needsSaving{
				h.saveDocument()
				h.needsSaving=false
			}
			cutoff:=float64(time.Now().Unix()-10)
			cutoffStr:=fmt.Sprintf("%f",cutoff)
			h.redisClient.ZRemRangeByScore(h.ctx,"room_presence:"+h.roomId,"-inf",cutoffStr)
			h.publishPresenceState()
		}
	}
}
func (h *Hub) loadDocument(){
	ctx:=context.TODO()
	var mongoDoc MongoDocument
	err:=h.collection.FindOne(ctx,bson.M{"_id":h.roomId}).Decode(&mongoDoc)
	switch err {
	case nil:
		h.document.Chars=mongoDoc.Chars
		fmt.Println("Loaded existing document from MongoDB!")
	case mongo.ErrNoDocuments:
		emptyDoc:=MongoDocument{
			ID:h.roomId,
			Chars:[]crdt.Char{},
		}
		_,insertErr:=h.collection.InsertOne(ctx,emptyDoc)
		if insertErr!=nil{
			fmt.Println("Error inserting new document",insertErr)
		} else{
			fmt.Println("Created new document in MongoDB!")
		}
	default:
		fmt.Println("Error querying MongoDB: ",err)
	}
}

func (h *Hub) saveDocument(){
	ctx:=context.TODO()
	filter:=bson.M{"_id":h.roomId}

	update:=bson.M{
		"$set":bson.M{
			"chars":h.document.Chars,
		},
	}
	_,err:=h.collection.UpdateOne(ctx,filter,update)
	if err!=nil{
		log.Println("Failed to auto-save to MongoDB: ",err)
	} else{
		log.Println("Auto-saved document to MongoDB!")
	}
}

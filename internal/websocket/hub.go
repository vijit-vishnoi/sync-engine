package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"
	"github.com/gorilla/websocket"
	"github.com/vijit-vishnoi/internal/crdt"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	document *crdt.Document
	collection *mongo.Collection
	needsSaving bool 
	roomId string
}

type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}
type SyncMessage struct{
	Type string `json:"type"`
	Char crdt.Char `json:"char"`
	FullDoc []crdt.Char `json:"fullDoc,omitempty"`
	SenderId string `json:"senderId,omitempty"`
}

type MongoDocument struct{
	ID string `bson:"_id"`
	Chars []crdt.Char `bson:"chars"`
}

func NewHub(collection *mongo.Collection,roomId string) *Hub{
	h:=&Hub{
		register: make(chan *Client),
		unregister: make(chan *Client),
		clients: make(map[*Client]bool),
		broadcast: make(chan []byte),
		document: &crdt.Document{},
		collection: collection,
		roomId: roomId,
	}
	h.loadDocument()
	return h
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
		case client:=<-h.unregister:
			if _,ok:=h.clients[client];ok{
				delete(h.clients,client)
				close(client.send)
			}
			 
		case message:=<-h.broadcast:
			var syncMsg SyncMessage
			err:=json.Unmarshal(message,&syncMsg)
			if err==nil{
				switch syncMsg.Type {
				case "insert":
					h.document.Insert(syncMsg.Char)
				case "delete":
					h.document.Delete(syncMsg.Char)
				}
			}else{
				log.Println("Error parsing message:",err)
			}
			for client:=range h.clients{
				select {
				case client.send<-message:
				default:
					close(client.send)
					delete(h.clients,client)
				}
			}
			h.needsSaving=true
		case <-ticker.C:
			if h.needsSaving{
				h.saveDocument()
				h.needsSaving=false
			}
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
package websocket

import (
	"encoding/json"
	"log"

	"github.com/gorilla/websocket"
	"github.com/vijit-vishnoi/internal/crdt"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	document *crdt.Document
	collection *mongo.Collection
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
func NewHub(collection *mongo.Collection) *Hub{
	h:=&Hub{
		register: make(chan *Client),
		unregister: make(chan *Client),
		clients: make(map[*Client]bool),
		broadcast: make(chan []byte),
		document: &crdt.Document{},
		collection: collection,
	}
	return h
}
func (h *Hub)Run(){
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
		}
	}
}
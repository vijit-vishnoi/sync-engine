package websocket

import (
	"github.com/gorilla/websocket"
)

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
}

type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}
func NewHub() *Hub{
	h:=&Hub{
		register: make(chan *Client),
		unregister: make(chan *Client),
		clients: make(map[*Client]bool),
		broadcast: make(chan []byte),
	}
	return h
}
func (h *Hub)Run(){
	for{
		select {
		case client:=<-h.register:
			h.clients[client]=true;
		case client:=<-h.unregister:
			if _,ok:=h.clients[client];ok{
				delete(h.clients,client)
				close(client.send)
			}
			 
		case message:=<-h.broadcast:
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
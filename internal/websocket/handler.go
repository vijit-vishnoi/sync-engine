package websocket

import (
	"log"
	"net/http"
	"github.com/gorilla/websocket"
)

func HandleConnection(hub *Hub,w http.ResponseWriter,r *http.Request){
	conn,err:=upgrader.Upgrade(w,r,nil)
	if err!=nil{
		log.Println(err)
		return
	}
	client:=&Client{
		hub:hub,
		conn:conn,
		send:make(chan []byte,256),
	}
	client.hub.register<-client
	defer func ()  {
		client.hub.unregister<-client
		conn.Close()
	}()
	go client.writePump()
	client.readPump()
}
func (c *Client) readPump(){
	for{
		_,p,err:=c.conn.ReadMessage()
		if err!=nil{
			log.Println(err) 
			return
		}
		c.hub.broadcast<-p
	}
}
func (c *Client) writePump(){
	for message:=range c.send{
		err:=c.conn.WriteMessage(websocket.TextMessage,message)
		if err!=nil{
			log.Println(err)
			return
		}

	}
}
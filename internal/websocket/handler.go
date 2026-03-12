package websocket

import (
	"log"
	"net/http"
)

func HandleConnection(hub *Hub,w http.ResponseWriter,r *http.Request){
	conn,err:=upgrader.Upgrade(w,r,nil)
	if err!=nil{
		log.Println(err)
		return
	}
	for{
		messageType,p,err:=conn.ReadMessage()
		if err!=nil{
			log.Println(err)  
			return
		}
		if err:=conn.WriteMessage(messageType,p);err!=nil{
			log.Println(err)
			return 
		}
	}
	
	defer func ()  {
		client.hub.unregister<-client
		conn.Close()
	}()
}
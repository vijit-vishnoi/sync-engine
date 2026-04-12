package websocket

import (
	"sync"

	"go.mongodb.org/mongo-driver/v2/mongo"
)
type RoomManager struct{
	rooms map[string]*Hub
	collection *mongo.Collection
	mutex sync.RWMutex
}

func NewRoomManager(collection *mongo.Collection) *RoomManager{
	return &RoomManager{
		rooms: make(map[string]*Hub),
		collection: collection,
	}
}

func (rm *RoomManager) GetOrCreateRoom(roomId string) *Hub{
	rm.mutex.Lock()
	defer rm.mutex.Unlock()
	if hub,exists:=rm.rooms[roomId];exists{
		return hub
	}
	hub:=NewHub(rm.collection,roomId)
	go hub.Run()

	rm.rooms[roomId]=hub
	return hub
}
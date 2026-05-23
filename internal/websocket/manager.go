package websocket

import (
	"sync"

	"github.com/vijit-vishnoi/internal/executor"
	"go.mongodb.org/mongo-driver/v2/mongo"
)
type RoomManager struct{
	rooms map[string]*Hub
	collection *mongo.Collection
	mutex sync.RWMutex
	executor executor.CodeExecutor
}

func NewRoomManager(collection *mongo.Collection,exec executor.CodeExecutor) *RoomManager{
	return &RoomManager{
		rooms: make(map[string]*Hub),
		collection: collection,
		executor: exec,
	}
}

func (rm *RoomManager) GetOrCreateRoom(roomId string) *Hub{
	rm.mutex.Lock()
	defer rm.mutex.Unlock()
	if hub,exists:=rm.rooms[roomId];exists{
		return hub
	}
	hub:=NewHub(rm.collection,roomId,rm.executor)
	go hub.Run()

	rm.rooms[roomId]=hub
	return hub
}
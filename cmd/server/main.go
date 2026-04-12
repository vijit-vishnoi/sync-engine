package main

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/vijit-vishnoi/internal/websocket"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func main() {
	port:="8080"
	MONGO_URL:="mongodb://localhost:27017"
	clientOptions:=options.Client().ApplyURI(MONGO_URL)

	ctx,cancel:=context.WithTimeout(context.Background(),5*time.Second)
	defer cancel()

	client,err:=mongo.Connect(clientOptions)
	if err!=nil{
		fmt.Println(err)
		panic(err)
	}
	fmt.Println("Connected to MongoDB!")
	err=client.Ping(ctx,nil)
	if err!=nil{
		fmt.Println(err)
		panic(err)
	}
	collection:=client.Database("syncengine").Collection("documents")
	manager:=websocket.NewRoomManager(collection)
	r:=chi.NewRouter();
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Get("/health",func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK);
		w.Write([]byte("Health check passed"));
	})

	r.Get("/ws/{roomId}",func(w http.ResponseWriter,r *http.Request){
		roomId:=chi.URLParam(r,"roomId")
		hub:=manager.GetOrCreateRoom(roomId)
		websocket.HandleConnection(hub,w,r)
	})
	fmt.Println("Server is listening to port:",port);
	err=http.ListenAndServe(":"+port,r)
	if err!=nil{
		fmt.Println("Server failed due to",err);
	}

}
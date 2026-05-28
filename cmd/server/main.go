package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
	"github.com/vijit-vishnoi/internal/executor"
	"github.com/vijit-vishnoi/internal/websocket"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: No .env file found. Using system environment variables")
	}

	clientId := os.Getenv("JDOODLE_CLIENT_ID")
	clientSecret := os.Getenv("JDOODLE_CLIENT_SECRET")
	port:=os.Getenv("PORT")
	if port==""{
		port="8080"
	}
	MONGO_URL:=os.Getenv("MONGO_URL")
	if MONGO_URL==""{
		MONGO_URL="mongodb://127.0.0.1:27017"
	}
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
	
	
	if clientId == "" || clientSecret == "" {
		log.Println("WARNING: JDoodle keys are missing from .env!")
	}
	codeExec:=executor.NewJDoodleExecutor(clientId,clientSecret)
	manager:=websocket.NewRoomManager(collection,codeExec)
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
		websocket.HandleConnection(hub,w,r);
	})
	fmt.Println("Server is listening to port:",port);
	err=http.ListenAndServe(":"+port,r)
	if err!=nil{
		fmt.Println("Server failed due to",err);
	}

}
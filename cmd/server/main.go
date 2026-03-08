package main

import (
	"fmt"
	"net/http"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func main() {
	port:="8080"
	r:=chi.NewRouter();
	r.Use(middleware.Logger);
	r.Use(middleware.Recoverer);
	r.Get("/health",func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK);
		w.Write([]byte("Health check passed"));
	})
	fmt.Println("Server is listening to port:",port);
	err:=http.ListenAndServe(":"+port,r)
	if err!=nil{
		fmt.Println("Server failed due to",err);
	}
}
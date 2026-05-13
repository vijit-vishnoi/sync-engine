package executor

type Judege0Executor struct{
	APIKey string
	URL string
}

func NewJudge0Executor(apiKey string) *Judege0Executor{
	return &Judege0Executor{
		APIKey:apiKey,
		URL: "https://judge0-ce.p.rapidapi.com",
	}
}

func (j *Judege0Executor)Execute(code string,languageId int)(string, error){
	
	return "Code execution output will go",nil
}
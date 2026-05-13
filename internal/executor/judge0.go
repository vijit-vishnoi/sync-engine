package executor

type Judge0Executor struct{
	APIKey string
	URL string
}

func NewJudge0Executor(apiKey string) *Judge0Executor{
	return &Judge0Executor{
		APIKey:apiKey,
		URL: "https://judge0-ce.p.rapidapi.com",
	}
}

func (j *Judge0Executor)Execute(code string,languageId int)(string, error){
	
	return "Code execution output will go",nil
}
package crdt
import ("sort")
type Identifier struct{
	Digit int `json:"digit"`
	SiteId string `json:"siteId"`
}
type Char struct{
	Value rune `json:"value"`
	Position []Identifier `json:"position"`
}
type Document struct{
	Chars []Char `json:"chars"`
}
func (doc *Document) Insert(char Char){
	index :=sort.Search(len(doc.Chars),func(i int)bool{
		return ComparePosition(doc.Chars[i].Position,char.Position)>=0
	})
	if index<len(doc.Chars) && ComparePosition(doc.Chars[index].Position,char.Position)==0{
		return 
	} 
	doc.Chars=append(doc.Chars[:index],append([]Char{char},doc.Chars[index:]...)...)
}

func (doc *Document) Delete(char Char){
	index:=sort.Search(len(doc.Chars),func(i int) bool {
		return ComparePosition(doc.Chars[i].Position,char.Position)>=0
	})
	if index<len(doc.Chars)&& ComparePosition(doc.Chars[index].Position,char.Position)==0{
		doc.Chars=append(doc.Chars[:index],doc.Chars[index+1:]... )
	}
}

func ComparePosition(pos1,pos2 []Identifier)int{
	minLenth:=min(len(pos1),len(pos2))
	for  i:=0;i<minLenth;i++{
		id1:=pos1[i]
		id2:=pos2[i]
		if id1.Digit<id2.Digit{
			return -1
		} 
		if id1.Digit>id2.Digit{
			return 1
		}
		if id1.SiteId<id2.SiteId{
			return -1
		} else if id1.SiteId>id2.SiteId{
			return 1
		}
	}
	if len(pos1)<len(pos2) {
		return -1
	} 
	if len(pos1)>len(pos2){
		return 1
	}
	return 0
}
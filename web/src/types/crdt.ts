export interface Identifier {
  digit: number;
  siteId: string;
}

export interface CRDTChar {
  value: number; 
  position: Identifier[];
}

export interface SyncMessage {
  type: 'init' | 'insert' | 'delete';
  char?: CRDTChar;
  fullDoc?: CRDTChar[];
}

const HASHSIZE = 101; // Tamanho da tabela de hash
// Classe Symbol para representar um símbolo (label ou variável)
class Symbol {
  constructor(name, type, location) {
    this.name = name;       // Nome do símbolo
    this.type = type;       // Tipo (label ou variável)
    this.location = location; // Localização na memória
    this.next = null;       // Próximo símbolo (para lidar com colisões na tabela hash)
  }
}

// Classe SymbolTable para gerenciar a tabela de símbolos
export class SymbolTable {
  constructor() {
    this.hashtab = Array(HASHSIZE).fill(null); // Tabela de hash inicializada com null
  }

  // Função de hash para calcular o índice baseado no nome
  hash(name) {
    let hashval = 0;
    for (let i = 0; i < name.length; i++) {
      hashval = name.charCodeAt(i) + 31 * hashval;
    }
    return hashval % HASHSIZE;
  }

  // Procura um símbolo na tabela de símbolos
  lookupSymbol(name) {
    const hashval = this.hash(name);
    let symbol = this.hashtab[hashval];

    while (symbol !== null) {
      if (symbol.name === name) {
        return symbol; // Retorna o símbolo encontrado
      }
      symbol = symbol.next;
    }
    return null; // Retorna null se não encontrou
  }

  // Insere um símbolo na tabela de símbolos
  installSymbol(name, type, location) {
    let symbol = this.lookupSymbol(name);

    // Se o símbolo não existe, cria um novo e insere na tabela
    if (symbol === null) {
      const hashval = this.hash(name);
      symbol = new Symbol(name, type, location);
      symbol.next = this.hashtab[hashval]; // Encadeamento para tratar colisões
      this.hashtab[hashval] = symbol;
    }
    return symbol; // Retorna o símbolo (novo ou existente)
  }
}

export default SymbolTable

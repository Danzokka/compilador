// Classe Symbol para representar um símbolo (label ou variável)
class Symbol {
  constructor(name, type, location) {
    this.name = name;       // Nome do símbolo
    this.type = type;       // Tipo (label ou variável)
    this.location = location; // Localização na memória
  }
}

// Classe SymbolTable para gerenciar a tabela de símbolos
export class SymbolTable {
  constructor() {
    this.symbols = {}; // Objeto para armazenar os símbolos
  }

  // Procura um símbolo na tabela de símbolos
  lookupSymbol(name) {
    return this.symbols[name] || null; // Retorna o símbolo ou null se não encontrado
  }

  // Insere um símbolo na tabela de símbolos
  installSymbol(name, type, location) {
    let symbol = this.lookupSymbol(name);

    // Se o símbolo já existe, retorna o existente para evitar a criação de um novo endereço
    if (symbol !== null) {
      return symbol;
    }

    // Se o símbolo não existe, cria um novo e insere na tabela
    symbol = new Symbol(name, type, location);
    this.symbols[name] = symbol; // Armazena o símbolo no objeto
    return symbol; // Retorna o novo símbolo
  }
}

export default SymbolTable;
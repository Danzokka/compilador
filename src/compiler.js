class Compiler {
  constructor(filename) {
    this.filename = filename;       // Nome do arquivo de entrada
    this.symbolTable = new SymbolTable(); // Tabela de símbolos
    this.instructionHandler = new Instruction(this); // Gerenciador de instruções
    this.exprHandler = new ExpressionHandler(this); // Gerenciador de expressões
    this.util = Util;               // Funções utilitárias

    // Propriedades principais
    this.memsize = MEMSIZE;         // Tamanho da memória
    this.hashtab = Array(HASHSIZE).fill(null); // Tabela de hash para símbolos
    this.sml = new Array(this.memsize).fill(0); // Código de máquina gerado (instruções SML)
    this.flag = new Array(this.memsize).fill(null); // Flags para referências de rótulos pendentes

    // Contadores e informações de controle
    this.inscount = 0;              // Contador de instruções
    this.datacount = this.memsize - 1; // Contador de dados
    this.ln = 1;                    // Linha atual do arquivo em análise
  }

  // Função para obter o próximo token do arquivo de entrada
  getToken() {
    return tokenizer.getNextToken();
  }

  // Função para "devolver" um token ao analisador léxico
  ungetToken(token) {
    tokenizer.ungetToken(token);
  }

  // Verifica se o tipo de token é o esperado, senão gera um erro
  checkToken(expectedType, actualType) {
    if (expectedType !== actualType) {
      this.util.syntaxError(this, `${expectedType} expected (got ${actualType})`);
    }
  }

  // Verifica se o comando é o esperado, senão gera um erro
  checkCommand(expected, actual) {
    if (expected.toUpperCase() !== actual.toUpperCase()) {
      this.util.syntaxError(this, `${expected} expected (got ${actual})`);
    }
  }

  // Função para obter uma expressão e convertê-la em notação pós-fixa
  getExpr() {
    return this.exprHandler.getExpr();
  }

  // Função para finalizar e limpar a memória utilizada pelo compilador
  cleanup() {
    this.util.cleanup(this);
  }
}

export default Compiler;
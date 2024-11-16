export class Tokenizer {
  constructor(input, symbolTable) {
    this.input = input;
    this.current = 0;
    this.line = 1;
    this.lineStart = true;
    this.ungottenToken = { type: 'UNKNOWN', value: null }; // token devolvido, se existir
    this.tokenStrings = {
      ENDOFFILE: "end of file",
      COMMENT: "comment",
      CONSTANT: "literal number",
      RELATIONAL: "relational operator",
      ARITHMETIC: "arithmetic operator",
      ASSIGNMENT: "equal sign",
      GOTOKEYWRD: "goto",
      COMMA: "comma",
      VARIABLE: "variable",
      EXPRESSION: "expression",
      LABEL: "label",
      NEWLINE: "newline",
      COMMAND: "command",
      LEFTPAREN: "left parenthesis",
      RIGHTPAREN: "right parenthesis",
      UNKNOWN: "unknown token"
    };
    this.symbolTable = symbolTable;
  }

  // Função auxiliar para verificar precedência dos operadores aritméticos
  isArithmetic(c) {
    if (c === '+' || c === '-') return 1;
    if (c === '/' || c === '*' || c === '%') return 2;
    return 0;
  }

  // Função auxiliar para verificar se uma string é um comando da linguagem
  isCommand(s) {
    return ['INPUT', 'PRINT', 'LET', 'GOTO', 'IF', 'END'].includes(s.toUpperCase());
  }

  //Função auxiliar para verificar se é uma expressão
  isExpression(toktype) {
    switch (toktype) {
      case 'CONSTANT':
      case 'ARITHMETIC':
      case 'VARIABLE':
      case 'LEFTPAREN':
      case 'RIGHTPAREN':
        return true;
      default:
        return false
    }
  }

  // Função para verificar se uma string representa um número
  isLineNumber(s) {
    return /^\d+$/.test(s);
  }

  skipWhitespace() {
    while (this.peek() === ' ' || this.peek() === '\t' || this.peek().charCodeAt(0) === 13 ) {
      if (this.peek() != undefined){
        this.current++;
      }
    }
  }

  // Função para obter o próximo token
  // Obtém o próximo token do input
  getToken() {
    if (this.ungottenToken.type !== 'UNKNOWN') {
      const token = this.ungottenToken;
      this.ungottenToken = { type: 'UNKNOWN', value: null };
      return token;
    }

    this.skipWhitespace();
    const s = [];
    let c = this.peek();

    // Identificar número da linha como uma label
    if (this.lineStart && /\d/.test(c)) {
      while (/\d/.test(this.peek())) {
        s.push(this.nextChar());
      }
      this.lineStart = false;

      const lineNumber = s.join('');
      this.symbolTable.installSymbol(lineNumber, "label", this.line); // Registra a label com o endereço atual
      this.skipWhitespace();
      return this.getToken();
    }


    s.length = 0;
    c = this.nextChar();
    this.lineStart = false;  // Depois do primeiro token da linha, não estamos mais no início

    switch (c) {
      case undefined:
        return { type: 'ENDOFFILE', value: null };
      case '\n':
        this.line++;
        this.lineStart = true;  // Marca o início de uma nova linha
        return { type: 'NEWLINE', value: '\n' };
      case '(':
        return { type: 'LEFTPAREN', value: '(' };
      case ')':
        return { type: 'RIGHTPAREN', value: ')' };
      case ',':
        return { type: 'COMMA', value: ',' };
      case ';':
        while (this.peek() !== '\n' && this.peek() !== undefined) this.current++;
        return { type: 'COMMENT', value: ';' };
      case '=':
        if (this.peek() === '=') {
          this.nextChar();
          return { type: 'RELATIONAL', value: '==' };
        }
        return { type: 'ASSIGNMENT', value: '=' };
      case '!':
        if (this.nextChar() !== '=') {
          this.syntaxError(`Caractere inesperado '${c}'`);
        }
        return { type: 'RELATIONAL', value: '!=' };
      case '<':
      case '>':
        if (this.peek() === '=') {
          return { type: 'RELATIONAL', value: c + this.nextChar() };
        }
        return { type: 'RELATIONAL', value: c };
      default:
        if (this.isArithmetic(c)) {
          return { type: 'ARITHMETIC', value: c };
        } else if (/[a-zA-Z]/.test(c)) {
          s.push(c);
          while (/[a-zA-Z]/.test(this.peek())) {
            s.push(this.nextChar());
          }
          const tokenStr = s.join('');
          if (this.isCommand(tokenStr)) {
            return { type: 'COMMAND', value: tokenStr };
          }
          return { type: 'VARIABLE', value: tokenStr };
        } else if (c === '-' || c === '+' || /\d/.test(c)) {
          if (c === '-' || c === '+') {
            if (!/\d/.test(this.peek())) {
              return { type: 'ARITHMETIC', value: c };
            }
          }
          s.push(c);
          while (/\d/.test(this.peek())) {
            s.push(this.nextChar());
          }
          return { type: 'CONSTANT', value: s.join('') };
        } else {
          this.syntaxError(`Caractere inesperado '${c}'`);
        }
    }
  }


  // Função para retornar um token
  ungetToken(token) {
    this.ungottenToken = token;
  }

  // Função auxiliar para capturar um número inteiro
  getInt() {
    let num = [];
    while (/\d/.test(this.peek())) {
      num.push(this.nextChar());
    }
    return num;
  }

  // Função auxiliar para exibir erro de sintaxe
  syntaxError(message) {
    throw new Error(`Syntax error at line ${this.line}: ${message}`);
  }

  // Função para obter o próximo caractere e avançar
  nextChar() {
    if (this.current >= this.input.length) {
      return undefined;
    }
    return this.input[this.current++];
  }

  // Função para ver o próximo caractere sem avançar
  peek() {

    if (this.current == this.input.length) {
      return '';
    }

    return this.input[this.current];
  }
}

/* eslint-disable no-unused-vars */
export class Tokenizer {
  constructor(input) {
    this.input = input;
    this.current = 0;
    this.line = 1;
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

  // Função para obter o próximo token
  getToken() {
    if (this.ungottenToken.type !== 'UNKNOWN') {
      const token = this.ungottenToken;
      this.ungottenToken = { type: 'UNKNOWN', value: null };
      return token;
    }

    // Ignora espaços em branco
    while (/\s/.test(this.peek())) {
      if (this.peek() === '\n') this.line++;
      this.current++;
    }

    let i = 0;
    let retval = 'UNKNOWN';
    const s = [];

    const c = this.nextChar();
    switch (c) {
      case undefined:
        retval = 'ENDOFFILE';
        break;
      case '\n':
        retval = 'NEWLINE';
        this.line++;
        break;
      case '(':
        retval = 'LEFTPAREN';
        break;
      case ')':
        retval = 'RIGHTPAREN';
        break;
      case ',':
        retval = 'COMMA';
        break;
      case ';':
        while (this.peek() !== '\n' && this.peek() !== undefined) this.current++;
        retval = 'COMMENT';
        break;
      case '=':
        s.push(c);
        if (this.peek() === '=') {
          s.push(this.nextChar());
          retval = 'RELATIONAL';
        } else {
          retval = 'ASSIGNMENT';
        }
        break;
      case '!':
        s.push(c);
        if (this.nextChar() !== '=') {
          this.syntaxError(`unexpected character '${c}'`);
        }
        s.push('=');
        retval = 'RELATIONAL';
        break;
      case '<':
      case '>':
        s.push(c);
        if (this.peek() === '=') s.push(this.nextChar());
        retval = 'RELATIONAL';
        break;
      default:
        if (this.isArithmetic(c)) {
          retval = 'ARITHMETIC';
        } else if (/[a-zA-Z]/.test(c)) {
          s.push(c);
          let nextChar = this.peek();
          while (/[a-zA-Z]/.test(nextChar)) {
            s.push(this.nextChar());
            nextChar = this.peek();
          }

          const tokenStr = s.join('');
          if (nextChar === ':') {
            retval = 'LABEL';
            this.nextChar();
          } else if (this.isCommand(tokenStr)) {
            retval = 'COMMAND';
          } else {
            retval = 'VARIABLE';
          }
        } else if (c === '-' || c === '+' || /\d/.test(c)) {
          let op = c;
          if (c === '-' || c === '+') {
            const nextChar = this.peek();
            if (!/\d/.test(nextChar)) {
              retval = 'ARITHMETIC';
            } else {
              s.push(this.nextChar());
            }
          }
          s.push(...this.getInt());
          retval = 'CONSTANT';
        } else {
          this.syntaxError(`unexpected character '${c}'`);
        }
        break;
    }
    return { type: retval, value: s.join('') };
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
    return this.input[this.current++];
  }

  // Função para ver o próximo caractere sem avançar
  peek() {
    return this.input[this.current];
  }
}

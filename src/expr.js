export class ExpressionHandler {
  constructor(compiler) {
    this.compiler = compiler;
  }

  getExpr() {
    let head = null;
    let tail = null;
    const stack = [];

    this.push(stack, '(');
    let token = this.compiler.getToken();

    while (this.isExpression(token.type) || this.isRelational(token.type)) {
      switch (token.type) {
        case "VARIABLE":
          ({ head, tail } = this.enqueue({ type: "symb", value: token.value }, head, tail));
          break;
        case "CONSTANT":
          ({ head, tail } = this.enqueue({ type: "num", value: token.value }, head, tail));
          break;
        case "LEFTPAREN":
          this.push(stack, '(');
          break;
        case "RIGHTPAREN":
          while (this.isArithmetic(this.top(stack)) || this.isRelational(this.top(stack))) {
            ({ head, tail } = this.enqueue({ type: "op", value: this.pop(stack) }, head, tail));
          }
          if (this.top(stack) === '(') this.pop(stack);
          break;
        case "ARITHMETIC":
          while ((this.isArithmetic(this.top(stack)) || this.isRelational(this.top(stack))) &&
            this.precedence(this.top(stack)) >= this.precedence(token.value)) {
            ({ head, tail } = this.enqueue({ type: "op", value: this.pop(stack) }, head, tail));
          }
          this.push(stack, token.value);
          break;
        case "RELATIONAL":
          while ((this.isArithmetic(this.top(stack)) || this.isRelational(this.top(stack))) &&
            this.precedence(this.top(stack)) >= this.precedence(token.value)) {
            ({ head, tail } = this.enqueue({ type: "op", value: this.pop(stack) }, head, tail));
          }
          this.push(stack, token.value);
          break;
        default:
          this.compiler.ungetToken(token);
          return this.toArray(head); // Converte a lista encadeada para um array antes de retornar
      }
      token = this.compiler.getToken();
    }

    while (this.isArithmetic(this.top(stack)) || this.isRelational(this.top(stack))) {
      ({ head, tail } = this.enqueue({ type: "op", value: this.pop(stack) }, head, tail));
    }

    this.compiler.ungetToken(token);

    if (stack.length > 1 || this.top(stack) !== '(') {
      this.compiler.syntaxError(`Expressão impropria, ${this.top(stack)}`);
    }

    return this.toArray(head); // Converte a lista encadeada para um array antes de retornar
  }

  // Função auxiliar para converter a lista encadeada em um array
  toArray(head) {
    const result = [];
    let current = head;
    while (current) {
      result.push(current);
      current = current.next;
    }
    return result;
  }

  // Adiciona um operador ou operando à lista de expressão
  enqueue(op, head, tail) {
    const node = { type: op.type, value: op.value, next: null };

    if (head === null) {
      head = node;
    } else {
      tail.next = node;
    }
    tail = node;

    return { head, tail }; // Retorna a lista atualizada
  }

  // Empilha um operador na pilha de operadores
  push(stack, value) {
    stack.push(value);
  }

  // Desempilha o operador do topo da pilha
  pop(stack) {
    if (stack.length === 0) {
      this.compiler.compileError("Trying to pop from an empty stack");
    }
    return stack.pop();
  }

  // Retorna o operador no topo da pilha sem removê-lo
  top(stack) {
    if (stack.length === 0) {
      this.compiler.compileError("Trying to access top of an empty stack");
    }
    return stack[stack.length - 1];
  }

  // Verifica se um token representa um operador aritmético e retorna sua precedência
  isArithmetic(op) {
    return ["+", "-", "*", "/", "%"].includes(op);
  }

  // Verifica se um token representa um operador relacional
  isRelational(op) {
    return ["==", "!=", "<", "<=", ">", ">="].includes(op);
  }

  // Retorna a precedência do operador
  precedence(op) {
    if (op === "+" || op === "-") return 1;
    if (op === "*" || op === "/" || op === "%") return 2;
    if (this.isRelational(op)) return 3;
    return 0;
  }

  // Verifica se um token é parte de uma expressão
  isExpression(type) {
    return ["CONSTANT", "ARITHMETIC", "VARIABLE", "LEFTPAREN", "RIGHTPAREN"].includes(type);
  }
}

export default ExpressionHandler;

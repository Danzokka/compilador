export class ExpressionHandler {
  constructor(compiler) {
    this.compiler = compiler;
  }

  // Converte uma expressão infixa para pós-fixa e retorna a lista de expressão
  getExpr() {
    let head = null, tail = null;
    const stack = [];

    this.push(stack, '(');
    let token = this.compiler.getToken();

    while (this.isExpression(token.type)) {
      switch (token.type) {
        case "VARIABLE":
          this.enqueue({ type: "symb", value: token.value }, head, tail);
          break;
        case "CONSTANT":
          this.enqueue({ type: "num", value: token.value }, head, tail);
          break;
        case "LEFTPAREN":
          this.push(stack, '(');
          break;
        case "RIGHTPAREN":
          while (this.isArithmetic(this.top(stack))) {
            this.enqueue({ type: "op", value: this.pop(stack) }, head, tail);
          }
          if (this.top(stack) === '(') this.pop(stack);
          break;
        case "ARITHMETIC":
          while (this.isArithmetic(this.top(stack)) &&
            this.precedence(this.top(stack)) >= this.precedence(token.value)) {
            this.enqueue({ type: "op", value: this.pop(stack) }, head, tail);
          }
          this.push(stack, token.value);
          break;
        default:
          break;
      }
      token = this.compiler.getToken();
    }
    while (this.isArithmetic(this.top(stack))) {
      this.enqueue({ type: "op", value: this.pop(stack) }, head, tail);
    }

    this.compiler.ungetToken(token);

    if (stack.length > 1 || this.top(stack) !== '(') {
      this.compiler.syntaxError(`improper expression, ${this.top(stack)} left`);
    }

    return head;
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

    return { head, tail };
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

  // Retorna a precedência do operador
  precedence(op) {
    if (op === "+" || op === "-") return 1;
    if (op === "*" || op === "/" || op === "%") return 2;
    return 0;
  }

  // Verifica se um token é parte de uma expressão
  isExpression(type) {
    return ["CONSTANT", "ARITHMETIC", "VARIABLE", "LEFTPAREN", "RIGHTPAREN"].includes(type);
  }
}

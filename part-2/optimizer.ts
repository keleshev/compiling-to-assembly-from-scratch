import {
  AST, Main, Assert, Number, Boolean, Undefined, Not, Equal, NotEqual, Add,
  Subtract, Multiply, Divide, Call, ArrayLiteral, ArrayLookup, Exit, Block, If,
  Function, Id, Return, While, Assign, Var, Visitor,
} from "./ast";

import { ASTTraversal } from "./ast-traversal";


class Optimizer extends ASTTraversal {
  constructor(public constants: Map<string, AST>) {
    super();
  }

  visitAdd(node: Add): AST {
    let left = node.left.visit(this);
    let right = node.right.visit(this);
    if (left instanceof Number && right instanceof Number) {
      return new Number(left.value + right.value);
    }
    return new Add(left, right);
  }

  visitId(node: Id): AST {
    let constant = this.constants.get(node.value);
    if (constant) {
      return constant;
    }
    return new Id(node.value);
  }

  visitIf(node: If): AST {
    let conditional = node.conditional.visit(this);
    let consequence = node.consequence.visit(this);
    this.constants.clear();
    let alternative = node.alternative.visit(this);
    this.constants.clear();
    return new If(conditional, consequence, alternative);
  }

  visitFunction(node: Function): AST {
    let visitor = new Optimizer(new Map()); 
    let body = node.body.visit(visitor);
    return new Function(node.name, node.signature, body);
  }

  visitAssign(node: Assign): AST {
    let value = node.value.visit(this);
    if (value instanceof Number) {
      this.constants.set(node.name, value);
    } else {
      this.constants.delete(node.name);
    }
    return new Assign(node.name, value);
  }

  visitVar(node: Var): AST {
    let value = node.value.visit(this);
    if (value instanceof Number) {
      this.constants.set(node.name, value);
    } else {
      this.constants.delete(node.name);
    }
    return new Var(node.name, value);
  }
}

export { Optimizer }

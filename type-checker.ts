import { 
  Type, BoolType, IntegerType, VoidType, ArrayType, FunctionType,
} from "./types";

import {
  AST, Main, Assert, Integer, Bool, Not, Equal, NotEqual, Add, Subtract,
  Multiply, Divide, Call, ArrayNode, ArrayLookup, Exit, Block, If,
  FunctionDefinition, Id, Return, While, Assign, Var, Visitor,
} from "./ast";


function assertType(expected: Type, got: Type): void {
  if (!expected.equals(got)) {
    throw Error(`Type error: expected ${expected}, but got ${got}`);
  }
}

class TypeChecker implements Visitor<Type> {
  constructor(public locals: Map<string, Type> = new Map(),
              public functions: Map<string, FunctionType> = new Map(),
              public currentFunctionReturnType: Type | null = null) {}

  visitMain(node: Main) {
    node.statements.forEach((statement) => statement.visit(this));
    return new VoidType();
  }

  visitAssert(node: Assert) {
    assertType(new BoolType(), node.condition.visit(this));
    return new VoidType();
  }

  visitInteger(node: Integer) {
    return new IntegerType();
  }

  visitBool(node: Bool) {
    return new BoolType();
  }

  visitNot(node: Not) {
    assertType(new BoolType(), node.term.visit(this));
    return new BoolType();
  }

  visitEqual(node: Equal) {
    let leftType = node.left.visit(this);
    let rightType = node.right.visit(this);
    assertType(leftType, rightType);
    return new BoolType();
  }

  visitNotEqual(node: NotEqual) {
    let leftType = node.left.visit(this);
    let rightType = node.right.visit(this);
    assertType(leftType, rightType);
    return new BoolType();
  }

  visitAdd(node: Add) {
    assertType(new IntegerType(), node.left.visit(this));
    assertType(new IntegerType(), node.right.visit(this));
    return new IntegerType();
  }

  visitSubtract(node: Subtract) {
    assertType(new IntegerType(), node.left.visit(this));
    assertType(new IntegerType(), node.right.visit(this));
    return new IntegerType();
  }

  visitMultiply(node: Multiply) {
    assertType(new IntegerType(), node.left.visit(this));
    assertType(new IntegerType(), node.right.visit(this));
    return new IntegerType();
  }

  visitDivide(node: Divide) {
    assertType(new IntegerType(), node.left.visit(this));
    assertType(new IntegerType(), node.right.visit(this));
    return new IntegerType();
  }

  visitCall(node: Call) {
    let expected = this.functions.get(node.callee);
    if (!expected) {
      throw Error(`Type error: function ${node.callee} is not defined`); 
    }
    let argsTypes = new Map();
    node.args.forEach((arg, i) => argsTypes.set(`x${i}`, arg.visit(this)));
    let got = new FunctionType(argsTypes, expected.returnType);
    assertType(expected, got);
    return expected.returnType;
  }

  visitArrayNode(node: ArrayNode) {
    if (node.args.length == 0) {
      throw Error("Type error: can't infer type of an empty array");
    }
    let argsTypes = node.args.map((arg) => arg.visit(this));
    // Assert all arguments have the same type, pairwise
    let elementType = argsTypes.reduce((prev, next) => {
      assertType(prev, next);
      return prev;
    });
    return new ArrayType(elementType);
  }

  visitArrayLookup(node: ArrayLookup) {
    assertType(new IntegerType(), node.index.visit(this));
    let type = node.array.visit(this);
    if (type instanceof ArrayType) {
      return type.element;
    } else {
      throw Error(`Type error: expected an array, but got ${type}`);
    }
  }

  visitExit(node: Exit) {
    assertType(new IntegerType(), node.term.visit(this));
    return new VoidType();
  }

  visitBlock(node: Block) {
    node.statements.forEach((statement) => statement.visit(this));
    return new VoidType();
  }

  visitIf(node: If) {
    node.conditional.visit(this);
    node.consequence.visit(this);
    node.alternative.visit(this);
    return new VoidType();
  }

  visitFunctionDefinition(node: FunctionDefinition) {
    if (this.currentFunctionReturnType) {
      throw Error("Nexted functions are not supported");
    }
    this.functions.set(node.name, node.signature);
    let visitor = new TypeChecker( 
      new Map(node.signature.parameters),
      this.functions,
      node.signature.returnType,
    );
    node.body.visit(visitor);
    return new VoidType();
  }

  visitId(node: Id) {
    let type = this.locals.get(node.value);
    if (!type) {
      throw Error(`Type error: undefined variable ${node.value}`);
    }
    return type;
  }

  visitReturn(node: Return) {
    let type = node.term.visit(this);
    if (this.currentFunctionReturnType) {
      assertType(this.currentFunctionReturnType, type);
      return new VoidType();
    } else {
      throw Error("Encountered return statement outside any function");
    }
  }

  visitWhile(node: While) {
    node.conditional.visit(this);
    node.body.visit(this);
    return new VoidType();
  }

  visitAssign(node: Assign) {
    let variableType = this.locals.get(node.name);
    if (!variableType) {
      throw Error(`Type error: assignment to an undefined variable ${node.name}`);
    }
    let valueType = node.value.visit(this);
    assertType(variableType, valueType);
    return new VoidType();
  }

  visitVar(node: Var) {
    let type = node.value.visit(this);
    this.locals.set(node.name, type);
    return new VoidType();
  }
}

export { TypeChecker }

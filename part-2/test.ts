import { 
  Type, BooleanType, NumberType, VoidType, ArrayType, FunctionType,
} from "./types";

import {
  AST, Main, Assert, Number, Boolean, Not, Equal, NotEqual, Add, Subtract,
  Multiply, Divide, Call, ArrayLiteral, ArrayLookup, Exit, Block, If,
  Function, Id, Return, While, Assign, Var, Visitor,
} from "./ast";

import { TypeChecker } from "./type-checker"
import { CodeGenerator, CodeGeneratorDynamicTyping } from "./code-generator"
import { ASTTraversal } from "./ast-traversal"
import { Optimizer } from "./optimizer"
import { ParseResult, Source, Parser } from "./parser-combinators"
import { statement, expression, parser } from "./parser"

let test = (name: string, callback: () => void) => callback();

test("Source matching is idempotent", () => {
  let s = new Source('  let', 2);
  let result1 = s.match(/let/y);
  console.assert(result1 !== null && result1.value === 'let' && result1.source.index === 5);
  let result2 = s.match(/let/y);
  console.assert(result2 !== null && result2.value === 'let' && result2.source.index === 5);
});

let {regexp, constant, maybe, zeroOrMore, error} = Parser;

test("Parsing alternatives with `or`", () => {
  let parser = regexp(/bye/y).or(regexp(/hai/y));
  let result = parser.parseStringToCompletion('hai');
  console.assert(result == 'hai');
});

test("Parsing with bindings", () => {
  let parser = regexp(/[a-z]+/y).bind((word) =>
    regexp(/[0-9]+/y).bind((digits) =>
      constant(`first ${word}, then ${digits}`)));
  let result = parser.parseStringToCompletion('hai123');
  console.assert(result == 'first hai, then 123');
});

test("Expression parser", () => {
  console.log();
  let [x, y, z] = [new Id('x'), new Id('y'), new Id('z')];
  let parse = (s: string) => expression.parseStringToCompletion(s);

  console.assert(parse('x + y + z').equals(new Add(new Add(x, y), z)));
  console.assert(parse('x + y * z').equals(new Add(x, new Multiply(y, z))));
  console.assert(parse('x * y + z').equals(new Add(new Multiply(x, y), z)));
  console.assert(parse('(x + y) * z').equals(new Multiply(new Add(x, y), z)));
  console.assert(parse('x == y + z').equals(new Equal(x, new Add(y, z))));
  console.assert(parse('x + y == z').equals(new Equal(new Add(x, y), z)));

  console.assert(parse('f()').equals(new Call('f', [])));
  console.assert(parse('f(x)').equals(new Call('f', [x])));
  console.assert(parse('f(x, y, z)').equals(new Call('f', [x, y, z])));
});

test("Statement parser", () => {
  console.log();
  let [x, y, z] = [new Id('x'), new Id('y'), new Id('z')];
  let parse = (s: string) => statement.parseStringToCompletion(s);

  console.assert(parse('return x;').equals(new Return(x)));
  console.assert(parse('returnx;').equals(new Id('returnx')));
  console.assert(parse('x + y;').equals(new Add(x, y)));

  console.assert(parse('if (x) return y; else return z;').equals(
    new If(x, new Return(y), new Return(z))));

  console.assert(parse('{}').equals(new Block([])));
  console.assert(parse('{ x; y; }').equals(new Block([x, y])));

  console.assert(parse('if (x) { return y; } else { return z; }').equals(
    new If(x, new Block([new Return(y)]), new Block([new Return(z)]))));

  //console.assert(parse('function id(x) { return x; }').equals(
  //  new Function('id', ['x'], new Block([new Return(x)]))));
});

test("Parser integration test", () => {
  let source = `
    function factorial(n: number): number {
      var result = 1;
      while (n != 1) {
        result = result * n;
        n = n - 1;
      }
      return result;
    }
  `;

  let expected = new Block([
    new Function(
      "factorial", 
      new FunctionType(new Map([["n", new NumberType()]]), new NumberType()),
      new Block([
        new Var("result", new Number(1)),
        new While(new NotEqual(new Id("n"), new Number(1)), new Block([
          new Assign("result", new Multiply(new Id("result"), new Id("n"))),
          new Assign("n", new Subtract(new Id("n"), new Number(1))),
        ])),
        new Return(new Id("result")),
      ]),
    ),
  ]);

  let result = parser.parseStringToCompletion(source);

  console.assert(result.equals(expected));
});

let parse = (s: string) => parser.parseStringToCompletion(s);

test("Optimizer: constant folding and constant propagation", () => {
  let before = parse(`
    function f(x) {
      var y = 1 + 2;
      var z = y + 3;
      assert(x == z);

      if (x) { z = 0; } else {}
      assert(x == z);

      z = g();
      return z;
    }
  `);

  let after = parse(`
    function f(x) {
      var y = 3;
      var z = 6;
      assert(x == 6);

      if (x) { z = 0; } else {}
      assert(x == z);

      z = g();
      return z;
    }
  `);

  let result = before.visit(new Optimizer(new Map()));

  console.assert(result.equals(after));
});

test("End-to-end test", () => {
  let source = `
    function assert(x: boolean): void {
      if (x) {
//	putchar(46);
	putchar(11);
      } else {
//	putchar(70);
	putchar(17);
      }
    }

    function return42(): number { return 42; }

    function returnNothing(): void {}

    function assert42(x: number): void {
      assert(x == 42);
    }

    function assert1234(a: number, b: number, c: number, d: number): void {
      assert(a == 1);
      assert(b == 2);
      assert(c == 3);
      assert(d == 4);
    }

    function pair(x: number, y: number): Array<number> {
      return [x, y];
    }

    function factorial(n: number): number {
      if (n == 0) {
        return 1;
      } else {
        return n * factorial(n - 1);
      }
    }

    function factorial2(n: number): number {
      var result = 1;
      while (n != 1) {
        result = result * n;
	n = n - 1;
      }
      return result;
    }

    function main() {
 
      // Test boolean and negation
      assert(true);
      assert(!false);
      assert(!(!true));

      //putchar(46);

      // Test Equal
      assert(42 == 42);
      assert(!(0 == 42));

      // Test NotEqual
      assert(!(42 != 42));
      assert(0 != 42);

      // Test infix operators
      assert(42 == 4 + 2 * (12 - 2) + 3 * (5 + 1));

      // Test Call with no parameters
      assert(return42() == 42);
      //assert(!returnNothing());

      // Test multiple parameters
      assert42(42);
      assert1234(1, 2, 3, 4);

      //assert(rand() != 42);
      //assert(putchar() != 1);

      //while (1) {
      //  assert(1);
      //}

      // Test If
      if (1) 
	assert(true);
      else
	assert(false);

      if (0) {
        assert(false);
      } else {
        assert(true);
      }

      assert(factorial(5) == 120);

      // var a = 42;
      // assert(a == 42);
      // var x = 0;
      //assert(4 + 2 * (12 - 2) == 24);
      //assert(4 + 2 * (12 - 2) + 3 * (5 + 1) == 42);

      var x = 4 + 2 * (12 - 2);
      var y = 3 * (5 + 1);
      var z = x + y;
      assert(z == 42);

      var a = 1;
      assert(a == 1);
      a = 0;
      assert(a == 0);

      // Test while loops
      var i = 0;
      while (i != 3) {
        i = i + 1;
      }
      assert(i == 3);

      assert(factorial2(5) == 120);

      // Test booleans
      assert(true);
      assert(!false);
      assert(true == true);
      assert(true != false);
      //assert(true == 1); // No type checking

      // Test array
      var a = [10, 20, 30]; 
      assert(a[0] == 10);
      assert(a[1] == 20);
      assert(a[2] == 30);
      assert(a[3] == undefined); // Bounds checking
      assert(a[10000000] == undefined); // Bounds checking
      assert(length(a) == 3);

      //putchar(10); // Newline
      return 0;
    }

//    function wrongReturnType1(): number {}  // TODO
  `;

  let ast = parser.parseStringToCompletion(source);

  let astCopy = ast.visit(new ASTTraversal());
  console.assert(ast.equals(astCopy));

  //let typeChecker = new TypeChecker(
  //  new Map(),
  //  new Map([
  //    ["putchar", new FunctionType(new Map([["char", new NumberType()]]), new VoidType())],
  //  ]),
  //);
  //ast.visit(typeChecker);

  let codeGenerator = new CodeGeneratorDynamicTyping();
  //let codeGenerator = new CodeGenerator();
  ast.visit(codeGenerator);
});

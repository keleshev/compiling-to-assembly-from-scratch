/* vim: ft=javascript sw=2 */
let emit = console.log;
let test = (name: string, callback: () => void) => callback();

class ParseResult<T> {
  constructor(public value: T, public source: Source) {}
}

class Source {
  constructor(public string: string,
              public index: number) {}

  match(regexp: RegExp): (ParseResult<string> | null) {
    console.assert(regexp['sticky']);
    regexp.lastIndex = this.index;
    let match = this.string.match(regexp);
    //console.log('matching', regexp, 'at index', this.index,
    //            'gave', match && JSON.stringify(match[0]));
    if (match) {
      let value = match[0];
      let source = new Source(this.string, this.index + value.length);
      return new ParseResult(value, source); 
    }
    return null;
  }
}

test("Source matching is idempotent", () => {
  let s = new Source('  let', 2);
  let result1 = s.match(/let/y);
  console.assert(result1.value == 'let' && result1.source.index == 5);
  let result2 = s.match(/let/y);
  console.assert(result2.value == 'let' && result2.source.index == 5);
});


interface Parser<T> {
  parse(Source): ParseResult<T> | null;
}


class Parser<T> {
  constructor(public parse: (Source) => (ParseResult<T> | null)) {}

  /* Primitive combinators */

  static regexp(regexp: RegExp): Parser<string> {
    return new Parser(source => source.match(regexp));
  }

  static constant<U>(value: U): Parser<U> {
    return new Parser(source => new ParseResult(value, source));
  }

  static error<U>(message: string): Parser<U> {
    return new Parser(source => { throw Error(source.string.slice(source.index)) });
  }

  
  or(parser: Parser<T>): Parser<T> {
    return new Parser((source) => {
      let result = this.parse(source);
      if (result)
        return result;
      else
        return parser.parse(source);
    });
  }
  static zeroOrMore<U>(parser: Parser<U>): Parser<Array<U>> {
    // zeroOrMore: (parser zeroOrMore(parser))?
    //return parser.bind(item => 
    //  zeroOrMore(parser).bind(items => 
    //    constant([item, ...items]))).or(constant([]));

    return new Parser(source => {
      let results = [];
      let item;
      while (item = parser.parse(source)) {
        source = item.source;
        results.push(item.value);
      }
      return new ParseResult(results, source);
    });
  }

  bind<U>(callback: (T) => Parser<U>): Parser<U> {
    return new Parser((source) => {
      let result = this.parse(source);
      if (result)
        return callback(result.value).parse(result.source);
      else
        return null;
    });
  }

  /* Non-primitive, composite combinators */

  and<U>(parser: Parser<U>): Parser<U> {
    return this.bind((_) => parser);
  }

  map<U>(callback: (t: T) => U): Parser<U> {
    return this.bind((value) => constant(callback(value)));
  }

  // TODO Do we really need this? This is barely used.
  static maybe<U>(parser: Parser<U>): Parser<U | null> {
    return parser.or(constant(null));
  }

  parseStringToCompletion(string: string): T {
    let source = new Source(string, 0);

    let result = this.parse(source);
    if (!result)
      throw Error("Parse error: could not parse anything at all");

    let index = result.source.index;
    if (index != result.source.string.length)
      throw Error("Parse error at index " + index);

    return result.value;
  }
}

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

let whitespace = regexp(/[ \n\r\t]+/y);
let comments = regexp(/[/][/].*/y).or(regexp(/[/][*].*[*][/]/sy))
let ignored = zeroOrMore(whitespace.or(comments));

let token = (pattern) =>
  Parser.regexp(pattern).bind((value) =>
    ignored.and(constant(value)));

// Keywords
let FUNCTION = token(/function\b/y);
let IF = token(/if\b/y);
let WHILE = token(/while\b/y);  // TODO
let ELSE = token(/else\b/y);
let RETURN = token(/return\b/y);
let VAR = token(/var\b/y);  // TODO

let COMMA = token(/[,]/y);
let SEMICOLON = token(/;/y);
let LEFT_PAREN = token(/[(]/y);
let RIGHT_PAREN = token(/[)]/y);
let LEFT_BRACE = token(/[{]/y);
let RIGHT_BRACE = token(/[}]/y);

let INTEGER =
  token(/[0-9]+/y).map((digits) =>
    new Integer(parseInt(digits)));

let ID =
  token(/[a-zA-Z_][a-zA-Z0-9_]*/y);

let id = ID.map((x) => new Id(x));

// Operators
let NOT = token(/!/y).map((_) => Not);
let EQUAL = token(/==/y).map((_) => Equal);
let NOT_EQUAL = token(/!=/y).map((_) => NotEqual);
let PLUS = token(/[+]/y).map((_) => Add);
let MINUS = token(/[-]/y).map((_) => Subtract);
let STAR = token(/[*]/y).map((_) => Multiply);
let SLASH = token(/[\/]/y).map((_) => Divide);
let ASSIGN = token(/=/y).map((_) => Assign); // TODO



let expression: Parser<AST> = 
  Parser.error("expression parser used before definition");


// args <- (expression (COMMA expression)*)?
let args: Parser<Array<AST>> =
  expression.bind((arg) =>
    zeroOrMore(COMMA.and(expression)).bind((args) =>
      constant([arg, ...args]))).or(constant([]))

// call <- ID LEFT_PAREN args RIGHT_PAREN
let call: Parser<AST> =
  ID.bind((callee) =>
    LEFT_PAREN.and(args.bind((args) =>
      RIGHT_PAREN.and(constant(
        callee === '__assert' 
          ? new Assert(args[0])
	  : new Call(callee, args))))));


// atom <- call / ID / INTEGER / LEFT_PAREN expression RIGHT_PAREN
let atom: Parser<AST> =
  call.or(id).or(INTEGER).or(LEFT_PAREN.and(expression).bind((e) =>
    RIGHT_PAREN.and(constant(e))));

// unary <- NOT? atom
let unary: Parser<AST> =
  maybe(NOT).bind((not) =>
    atom.map((term) => not ? new Not(term) : term));


// (v1) product <- atom (STAR atom)*
//let product: Parser<AST> =
//  atom.bind((term) =>
//    zeroOrMore(STAR.and(atom)).map((terms) =>
//      terms.reduce((left, right) =>
//        new Multiply(left, right), term)));

// (v1) sum <- product (PLUS product)*
//let sum: Parser<AST> =
//  product.bind((term) =>
//    zeroOrMore(PLUS.and(product)).map((terms) =>
//      terms.reduce((left, right) => new Add(left, right), term)));

// (v2) sum <- product ((PLUS / MINUS) product)*
//let sum: Parser<AST> =
//  product.bind((term) =>
//    zeroOrMore(PLUS.or(MINUS).bind((operator) =>
//      product.map((term) => ({operator, term})))).map((operator_terms) =>
//	operator_terms.reduce((left, {operator, term}) =>
//	  new operator(left, term), term)));
//
let infix = (operatorParser, termParser) =>
  termParser.bind((term) =>
    zeroOrMore(operatorParser.bind((operator) =>
      termParser.bind((term) => 
	constant({operator, term})))).map((operatorTerms) =>
          operatorTerms.reduce((left, {operator, term}) =>
            new operator(left, term), term)));

// (real v1) product <- unary ((STAR / SLASH) unary)*
//let product =
//  unary.bind((first) =>
//    zeroOrMore(STAR.or(SLASH).bind((operator) =>
//      unary.bind((term) => 
//	constant({operator, term})))).map((operatorTerms) =>
//	  operatorTerms.reduce((left, {operator, term}) =>
//	    new operator(left, term), first)));
//

// product <- unary ((STAR / SLASH) unary)*
let product = infix(STAR.or(SLASH), unary);

// sum <- product ((PLUS / MINUS) product)*
let sum = infix(PLUS.or(MINUS), product);

// comparison <- sum ((EQUAL / NOT_EQUAL) sum)*
let comparison = infix(EQUAL.or(NOT_EQUAL), sum);

// expression <- comparison
expression.parse = comparison.parse;


let statement: Parser<AST> =
  Parser.error("statement parser used before definition");

// returnStatement <- RETURN expression SEMICOLON
let returnStatement: Parser<AST> =
  RETURN.and(expression).bind((term) =>
    SEMICOLON.and(constant(new Return(term))));

// expressionStatement <- expression SEMICOLON
let expressionStatement: Parser<AST> =
  expression.bind((term) => SEMICOLON.and(constant(term)));

// ifStatement <-
//   IF LEFT_PAREN expression RIGHT_PAREN statement ELSE statement
let ifStatement: Parser<AST> =
  IF.and(LEFT_PAREN).and(expression).bind((conditional) =>
    RIGHT_PAREN.and(statement).bind((consequence) =>
      ELSE.and(statement).bind((alternative) =>
	constant(new If(conditional, consequence, alternative)))));

// whileStatement <-
//   WHILE LEFT_PAREN expression RIGHT_PAREN statement
let whileStatement: Parser<AST> =
  WHILE.and(LEFT_PAREN).and(expression).bind((conditional) =>
    RIGHT_PAREN.and(statement).bind((body) =>
      constant(new While(conditional, body))));

// varStatement <- TODO
//   VAR ID ASSIGN expression SEMICOLON
let varStatement: Parser<AST> =
  VAR.and(ID).bind((name) =>
    ASSIGN.and(expression).bind((value) => 
      SEMICOLON.and(constant(new Var(name, value)))));

// assignmentStatement <- ID ASSIGN EXPRESSION SEMICOLON
let assignmentStatement: Parser<AST> =
  ID.bind((name) =>
    ASSIGN.and(expression).bind((value) => 
      SEMICOLON.and(constant(new Assign(name, value)))));

// blockStatement <- LEFT_BRACE statement* RIGHT_BRACE
let blockStatement: Parser<AST> =
  LEFT_BRACE.and(zeroOrMore(statement)).bind((statements) =>
    RIGHT_BRACE.and(constant(new Block(statements))));

// parameters <- ((ID COMMA)* ID)?
//let parameters: Parser<Array<string>> =
//  zeroOrMore(ID.bind((term) =>
//    COMMA.map((_) => term))).bind((args) =>
//      ID.map((arg) => args.concat(arg))).or(constant([]));

// parameters <- (ID (COMMA ID)*)?
let parameters: Parser<Array<string>> =
  ID.bind((param) =>
    zeroOrMore(COMMA.and(ID)).bind((params) =>
      constant([param, ...params]))).or(constant([]))

// functionStatement <-
//   FUNCTION ID LEFT_PAREN parameters RIGHT_PAREN blockStatement
let functionStatement: Parser<AST> =
  FUNCTION.and(ID).bind((name) =>
    LEFT_PAREN.and(parameters).bind((parameters) =>
      RIGHT_PAREN.and(blockStatement).bind((block) =>
        constant(
          name === '__main'
            ? new Main(block.statements)
            : new FunctionDefinition(name, parameters, block)))));


// statement <- returnStatement 
//            / ifStatement 
//            / whileStatement 
//            / varStatement 
//            / assignmentStatement 
//            / blockStatement
//            / functionStatement
//            / expressionStatement 
let statementParser: Parser<AST> =
  returnStatement
    .or(functionStatement)
    .or(ifStatement)
    .or(whileStatement)
    .or(varStatement)
    .or(assignmentStatement)
    .or(blockStatement)
    .or(expressionStatement);

statement.parse = statementParser.parse;

let parser: Parser<AST> =
  ignored.and(zeroOrMore(statement)).map((statements) =>
    new Block(statements));


//console.error(tokenize(`
//function factorial(n) {
//  if (n == 0) {
//    return 1;
//  } else {
//    return n * factorial(n - 1);
//  }
//}
//`));

class Label {
  static counter = 0;
  value: number;

  constructor() {
    this.value = Label.counter++;
  }

  toString() {
    return `.L${this.value}`;
  }
}

// TODO abstract base class?
//type AST = Integer | Not | Equal | NotEqual
//  | Add | Subtract | Multiply | Call | Id
//  | Assert | Exit | Block | Return | If | FunctionDefinition

class Environment {
  constructor(public locals: Map<string, number> = new Map(),
              public nextLocalOffset: number = 0) {}
}

interface AST {
  emit(Environment): void; 
  equals(AST): boolean;
}

//abstract class AST {
//  abstract emit(): void; 
//  abstract equals(AST): boolean;
//}


class Main implements AST {
  constructor(public statements: Array<AST>) {}

  emit(env: Environment) {
    emit(`.global main`);
    emit(`main:`);
    emit(`  push {fp, lr}`);
    this.statements.forEach((statement) =>
      statement.emit(env)
    );
    emit(`  mov r0, #0`);
    emit(`  pop {fp, pc}`);
  }

  equals(other: AST) {
    return other instanceof Main &&
      this.statements.length === other.statements.length &&
      this.statements.every((statement, i) =>
	statement.equals(other.statements[i]));
  }
}

class Assert implements AST {
  constructor(public condition: AST) {}

  emit(env: Environment) {
    this.condition.emit(env);
    emit(`  cmp r0, #1`);
    emit(`  moveq r0, #'.'`);
    emit(`  movne r0, #'F'`);
    emit(`  bl putchar`);
  }

  equals(other: AST) {
    return other instanceof Assert && 
      this.condition.equals(other.condition);
  }
}

class Integer implements AST {
  constructor(public value: number) {}

  emit(env: Environment) {
    emit(`  ldr r0, =${this.value}`);
  }

  equals(other: AST) {
    return other instanceof Integer &&
      this.value === other.value;
  }
}


class Not implements AST {
  constructor(public term: AST) {}

  emit(env: Environment) {
    this.term.emit(env);
    emit(`  cmp r0, #0`);
    emit(`  moveq r0, #1`);
    emit(`  movne r0, #0`);
  }

  equals(other: AST) {
    return other instanceof Not && this.term.equals(other.term);
  }
}

class Equal implements AST {
  constructor(public left: AST, public right: AST) {}

  emit(env: Environment) {
    this.left.emit(env);
    emit(`  push {r0, ip}`);
    this.right.emit(env);
    emit(`  pop {r1, ip}`);
    emit(`  cmp r0, r1`);
    emit(`  moveq r0, #1`);
    emit(`  movne r0, #0`);
  }

  equals(other: AST) {
    return other instanceof Equal &&
      this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

class NotEqual implements AST {
  constructor(public left: AST, public right: AST) {}

  emit(env: Environment) {
    this.left.emit(env);
    emit(`  push {r0, ip}`);
    this.right.emit(env);
    emit(`  pop {r1, ip}`);
    emit(`  cmp r0, r1`);
    emit(`  movne r0, #1`);
    emit(`  moveq r0, #0`);
  }

  equals(other: AST) {
    return other instanceof NotEqual &&
      this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

class Add implements AST {
  constructor(public left: AST, public right: AST) {}

  emit(env: Environment) {
    this.left.emit(env);
    emit(`  push {r0, ip}`);
    this.right.emit(env);
    emit(`  pop {r1, ip}`);
    emit(`  add r0, r1, r0`);
  }

  equals(other: AST) {
    return other instanceof Add &&
      this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

class Subtract implements AST {
  constructor(public left: AST, public right: AST) {}

  emit(env: Environment) {
    this.left.emit(env);
    emit(`  push {r0, ip}`);
    this.right.emit(env);
    emit(`  pop {r1, ip}`);
    emit(`  sub r0, r1, r0`);
  }

  equals(other: AST) {
    return other instanceof Subtract &&
      this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

class Multiply implements AST {
  constructor(public left: AST, public right: AST) {}

  emit(env: Environment) {
    this.left.emit(env);
    emit(`  push {r0, ip}`);
    this.right.emit(env);
    emit(`  pop {r1, ip}`);
    emit(`  mul r0, r1, r0`);
  }

  equals(other: AST) {
    return other instanceof Multiply &&
      this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

class Divide implements AST {
  constructor(public left: AST, public right: AST) {}

  emit(env: Environment) {
    this.left.emit(env);
    emit(`  push {r0, ip}`);
    this.right.emit(env);
    emit(`  pop {r1, ip}`);
    emit(`  udiv r0, r1, r0`);
  }

  equals(other: AST) {
    return other instanceof Divide &&
      this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

class Call implements AST {
  constructor(public callee: string, public args: Array<AST>) {}

  emit(env: Environment) {
    let count = this.args.length;
    if (count === 0) {
      emit(`  bl ${this.callee}`);
    } else if (count === 1) {
      this.args[0].emit(env);
      emit(`  bl ${this.callee}`);
    } else if (count >= 2 && count <= 4) {
      emit(`  sub sp, sp, #16`);
      this.args.forEach((arg, i) => {
        arg.emit(env);
        emit(`  str r0, [sp, #${4 * i}]`);
      });
      emit(`  pop {r0, r1, r2, r3}`);
      emit(`  bl ${this.callee}`);
    } else {
      throw Error("More than 4 arguments are not supported");
    }
  }

  equals(other: AST) {
    return other instanceof Call &&
      this.callee === other.callee &&
      this.args.length === other.args.length &&
      this.args.every((arg, i) => arg.equals(other.args[i]));
  }
}

class Exit implements AST {
  constructor(public term: AST) {}

  emit(env) {
    let syscallNumber = 1;
    emit(`  mov r0, #0`);
    emit(`  bl fflush`);
    this.term.emit(env);
    emit(`  mov r7, #${syscallNumber}`);
    emit(`  swi #0`);
  }

  equals(other: AST) {
    return other instanceof Exit && this.term.equals(other.term);
  }
}

class Block implements AST {
  constructor(public statements: Array<AST>) {}

  emit(env: Environment) {
    this.statements.forEach((statement) =>
      statement.emit(env)
    );
  }

  equals(other: AST) {
    return other instanceof Block &&
      this.statements.length === other.statements.length &&
      this.statements.every((statement, i) =>
	statement.equals(other.statements[i]));
  }
}

class If implements AST {
  constructor(public conditional: AST,
              public consequence: AST,
	      public alternative: AST) {}

  emit(env: Environment) {
    let ifFalseLabel = new Label();
    let endIfLabel = new Label();
    this.conditional.emit(env);
    emit(`  cmp r0, #0`);
    emit(`  beq ${ifFalseLabel}`);
    this.consequence.emit(env);
    emit(`  b ${endIfLabel}`);
    emit(`${ifFalseLabel}:`);
    this.alternative.emit(env);
    emit(`${endIfLabel}:`);
  }

  equals(other: AST) {
    return other instanceof If &&
      this.conditional.equals(other.conditional) &&
      this.consequence.equals(other.consequence) &&
      this.alternative.equals(other.alternative);
  }
}

class FunctionDefinition implements AST {
  constructor(public name: string,
              public parameters: Array<string>,
              public body: AST) {}

  emit(_: Environment) {
    if (this.parameters.length > 4) 
      throw Error("More than 4 params is not supported");

    emit(``);
    emit(`.global ${this.name}`);
    emit(`${this.name}:`);

    this.emitPrologue();
    let env = this.setUpEnvironment();
    this.body.emit(env);
    this.emitEpilogue();
  }

  emitPrologue() {
    emit(`  push {fp, lr}`);
    emit(`  mov fp, sp`);
    emit(`  push {r0, r1, r2, r3}`);
    // Alternatively:
    // emit(`  push {r0, r1, r2, r3, fp, lr}`);
    // emit(`  add fp, sp, #16`);
  }

  setUpEnvironment() {
    let env = new Environment();
    this.parameters.forEach((parameter, i) => {
      env.locals.set(parameter, 4 * i - 16);
    });
    env.nextLocalOffset = -20;
    return env;
  }

  emitEpilogue() {
    emit(`  mov sp, fp`);
    emit(`  mov r0, #0`);
    emit(`  pop {fp, pc}`);
  }

  equals(other: AST) {
    return other instanceof FunctionDefinition &&
      this.name === other.name &&
      this.parameters.length === other.parameters.length &&
      this.parameters.every((parameter, i) =>
	parameter === other.parameters[i]) &&
      this.body.equals(other.body);
  }
}

class Id implements AST {
  constructor(public value: string) {}

  emit(env: Environment) {
    let offset = env.locals.get(this.value);
    if (offset) {
      emit(`  ldr r0, [fp, #${offset}]`);
    } else {
      console.log(env);
      throw Error(`Undefined variable: ${this.value}`);
    }
  }

  equals(other: AST) {
    return other instanceof Id && 
      this.value === other.value;
  }
}

class Return implements AST {
  constructor(public term: AST) {}

  emit(env) {
    this.term.emit(env);
    emit(`  mov sp, fp`);
    emit(`  pop {fp, pc}`);
  }

  equals(other: AST) {
    return other instanceof Return && 
      this.term.equals(other.term);
  }
}


class While implements AST {
  constructor(public conditional: AST, public body: AST) {}

  emit(env: Environment) {
    let loopStart = new Label();
    let loopEnd = new Label();

    emit(`${loopStart}:`);
    this.conditional.emit(env);
    emit(`  cmp r0, #0`);
    emit(`  beq ${loopEnd}`);
    this.body.emit(env);
    emit(`  b ${loopStart}`);
    emit(`${loopEnd}:`);
  }

  equals(other: AST) {
    return other instanceof While &&
      this.conditional.equals(other.conditional) &&
      this.body.equals(other.body);
  }
}

class Assign implements AST {
  constructor(public name: string, public value: AST) {}

  emit(env: Environment) {
    this.value.emit(env);
    let offset = env.locals.get(this.name);
    if (offset) {
      emit(`  str r0, [fp, #${offset}]`);
    } else {
      throw Error(`Undefined variable: ${this.name}`);
    }
  }

  equals(other: AST) {
    return other instanceof Assign &&
      this.name === other.name &&
      this.value.equals(other.value);
  }
}

class Var implements AST {
  constructor(public name: string, public value: AST) {}

  emit(env: Environment) {
    this.value.emit(env);
    emit(`  push {r0, ip}`);
    env.locals.set(this.name, env.nextLocalOffset - 4);
    env.nextLocalOffset -= 8;
  }

  equals(other: AST) {
    return other instanceof Var &&
      this.name === other.name &&
      this.value.equals(other.value);
  }
}

test("Parser integration test", () => {
  let source = `
    function factorial(n) {
      var result = 1;
      while (n != 1) {
        result = result * n;
        n = n - 1;
      }
      return result;
    }
  `;

  let expected = new Block([
    new FunctionDefinition("factorial", ["n"], new Block([
      new Var("result", new Integer(1)),
      new While(new NotEqual(new Id("n"), new Integer(1)), new Block([
        new Assign("result", new Multiply(new Id("result"), new Id("n"))),
        new Assign("n", new Subtract(new Id("n"), new Integer(1))),
      ])),
      new Return(new Id("result")),
    ])),
  ]);

  let result = parser.parseStringToCompletion(source);

  console.assert(result.equals(expected));
});




let referenceAst: AST = new Block([
  new FunctionDefinition("main", [], new Block([

    // Test immediate
    new Assert(new Integer(1)),

    // Test not
    new Assert(new Not(new Integer(0))),
    new Assert(new Not(new Not(new Integer(42)))),

    // Test equal
    new Assert(new Equal(new Integer(42), new Integer(42))),
    new Assert(new Not(new Equal(new Integer(0), new Integer(42)))),

    // Test not equal
    new Assert(new Not(new NotEqual(new Integer(42), new Integer(42)))),
    new Assert(new NotEqual(new Integer(0), new Integer(42))),

    // Test return value and zero parameters
    new Assert(new Equal(new Integer(42), new Call("return42", []))),
    new Assert(new Not(new Call("returnNothing", []))),

    // TODO: Test parameters

    // Test if-else
    new If(new Integer(1),
           new Assert(new Integer(1)),
           new Assert(new Integer(0))),
    new If(new Integer(0),
           new Assert(new Integer(0)),
           new Assert(new Integer(1))),
  ])),

  new FunctionDefinition("return42", [], new Return(new Integer(42))),
  new FunctionDefinition("returnNothing", [], new Block([])),

]);

(function testIntegration() {
  let source = `
    function main() {
      // Test Integer
      assert(1);

      // Test Not
      assert(!0);
      assert(!(!1));

      putchar(46);

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
      assert(!returnNothing());

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
	assert(1);
      else
	assert(0);

      if (0) {
        assert(0);
      } else {
        assert(1);
      }

      assert(factorial(5) == 120);

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
    }

    function return42() { return 42; }
    function returnNothing() {}
    function assert42(x) {
      assert(x == 42);
    }
    function assert1234(a, b, c, d) {
      assert(a == 1);
      assert(b == 2);
      assert(c == 3);
      assert(d == 4);
    }

    function assert(x) {
      if (x) {
	putchar(46);
      } else {
	putchar(70);
      }
    }

    function factorial(n) {
      if (n == 0) {
        return 1;
      } else {
        return n * factorial(n - 1);
      }
    }

    function factorial2(n) {
      var result = 1;
      while (n != 1) {
        result = result * n;
	n = n - 1;
      }
      return result;
    }
  `;

  let ast = parser.parseStringToCompletion(source);

  ast.emit(new Environment());
})();



//ast.emit();


(function testParserExpression() {
  console.log();
  let [x, y, z] = [new Id('x'), new Id('y'), new Id('z')];
  let parse = (string) => expression.parseStringToCompletion(string);

  console.assert(parse('x + y + z').equals(new Add(new Add(x, y), z)));
  console.assert(parse('x + y * z').equals(new Add(x, new Multiply(y, z))));
  console.assert(parse('x * y + z').equals(new Add(new Multiply(x, y), z)));
  console.assert(parse('(x + y) * z').equals(new Multiply(new Add(x, y), z)));
  console.assert(parse('x == y + z').equals(new Equal(x, new Add(y, z))));
  console.assert(parse('x + y == z').equals(new Equal(new Add(x, y), z)));

  console.assert(parse('f()').equals(new Call('f', [])));
  console.assert(parse('f(x)').equals(new Call('f', [x])));
  console.assert(parse('f(x, y, z)').equals(new Call('f', [x, y, z])));
})();

(function testParserStatement() {
  console.log();
  let [x, y, z] = [new Id('x'), new Id('y'), new Id('z')];
  let parse = (string) => statement.parseStringToCompletion(string);

  console.assert(parse('return x;').equals(new Return(x)));
  console.assert(parse('returnx;').equals(new Id('returnx')));
  console.assert(parse('x + y;').equals(new Add(x, y)));

  console.assert(parse('if (x) return y; else return z;').equals(
    new If(x, new Return(y), new Return(z))));

  console.assert(parse('{}').equals(new Block([])));
  console.assert(parse('{ x; y; }').equals(new Block([x, y])));

  console.assert(parse('if (x) { return y; } else { return z; }').equals(
    new If(x, new Block([new Return(y)]), new Block([new Return(z)]))));

  console.assert(parse('function id(x) { return x; }').equals(
    new FunctionDefinition('id', ['x'], new Block([new Return(x)]))));
})();


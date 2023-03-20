define("types", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FunctionType = exports.ArrayType = exports.VoidType = exports.NumberType = exports.BooleanType = void 0;
    class BooleanType {
        equals(other) {
            return other instanceof BooleanType;
        }
        toString() {
            return "boolean";
        }
    }
    exports.BooleanType = BooleanType;
    class NumberType {
        equals(other) {
            return other instanceof NumberType;
        }
        toString() {
            return "number";
        }
    }
    exports.NumberType = NumberType;
    class VoidType {
        equals(other) {
            return other instanceof VoidType;
        }
        toString() {
            return "void";
        }
    }
    exports.VoidType = VoidType;
    class ArrayType {
        constructor(element) {
            this.element = element;
        }
        equals(other) {
            return other instanceof ArrayType &&
                this.element.equals(other.element);
        }
        toString() {
            return `Array<${this.element}>`;
        }
    }
    exports.ArrayType = ArrayType;
    class FunctionType {
        constructor(parameters, returnType) {
            this.parameters = parameters;
            this.returnType = returnType;
        }
        equals(other) {
            if (other instanceof FunctionType) {
                // Parameter names are irrelevant, compare only types
                let thisParameterTypes = Array.from(this.parameters.values());
                let otherParameterTypes = Array.from(other.parameters.values());
                return this.parameters.size === other.parameters.size &&
                    thisParameterTypes.every((parameter, i) => parameter.equals(otherParameterTypes[i])) &&
                    this.returnType.equals(other.returnType);
            }
            else {
                return false;
            }
        }
        toString() {
            let parameterStrings = Array.from(this.parameters).map(([name, type]) => `${name}: ${type}`);
            return `(${parameterStrings.join(', ')}) => ${this.returnType}`;
        }
    }
    exports.FunctionType = FunctionType;
});
define("ast", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Var = exports.Assign = exports.While = exports.Return = exports.Id = exports.Function = exports.If = exports.Block = exports.Exit = exports.ArrayLookup = exports.ArrayLiteral = exports.Call = exports.Divide = exports.Multiply = exports.Subtract = exports.Add = exports.NotEqual = exports.Equal = exports.Not = exports.Undefined = exports.Boolean = exports.Number = exports.Length = exports.Assert = exports.Main = void 0;
    class Main {
        constructor(statements) {
            this.statements = statements;
        }
        visit(v) { return v.visitMain(this); }
        equals(other) {
            return other instanceof Main &&
                this.statements.length === other.statements.length &&
                this.statements.every((statement, i) => statement.equals(other.statements[i]));
        }
    }
    exports.Main = Main;
    class Assert {
        constructor(condition) {
            this.condition = condition;
        }
        visit(v) { return v.visitAssert(this); }
        equals(other) {
            return other instanceof Assert &&
                this.condition.equals(other.condition);
        }
    }
    exports.Assert = Assert;
    class Length {
        constructor(array) {
            this.array = array;
        }
        visit(v) { return v.visitLength(this); }
        equals(other) {
            return other instanceof Length &&
                this.array.equals(other.array);
        }
    }
    exports.Length = Length;
    class Number {
        constructor(value) {
            this.value = value;
        }
        visit(v) { return v.visitNumber(this); }
        equals(other) {
            return other instanceof Number &&
                this.value === other.value;
        }
    }
    exports.Number = Number;
    class Boolean {
        constructor(value) {
            this.value = value;
        }
        visit(v) { return v.visitBoolean(this); }
        equals(other) {
            return other instanceof Boolean &&
                this.value === other.value;
        }
    }
    exports.Boolean = Boolean;
    class Undefined {
        constructor() { }
        visit(v) { return v.visitUndefined(this); }
        equals(other) {
            return other instanceof Undefined;
        }
    }
    exports.Undefined = Undefined;
    class Not {
        constructor(term) {
            this.term = term;
        }
        visit(v) { return v.visitNot(this); }
        equals(other) {
            return other instanceof Not && this.term.equals(other.term);
        }
    }
    exports.Not = Not;
    class Equal {
        constructor(left, right) {
            this.left = left;
            this.right = right;
        }
        visit(v) { return v.visitEqual(this); }
        equals(other) {
            return other instanceof Equal &&
                this.left.equals(other.left) &&
                this.right.equals(other.right);
        }
    }
    exports.Equal = Equal;
    class NotEqual {
        constructor(left, right) {
            this.left = left;
            this.right = right;
        }
        visit(v) { return v.visitNotEqual(this); }
        equals(other) {
            return other instanceof NotEqual &&
                this.left.equals(other.left) &&
                this.right.equals(other.right);
        }
    }
    exports.NotEqual = NotEqual;
    class Add {
        constructor(left, right) {
            this.left = left;
            this.right = right;
        }
        visit(v) { return v.visitAdd(this); }
        equals(other) {
            return other instanceof Add &&
                this.left.equals(other.left) &&
                this.right.equals(other.right);
        }
    }
    exports.Add = Add;
    class Subtract {
        constructor(left, right) {
            this.left = left;
            this.right = right;
        }
        visit(v) { return v.visitSubtract(this); }
        equals(other) {
            return other instanceof Subtract &&
                this.left.equals(other.left) &&
                this.right.equals(other.right);
        }
    }
    exports.Subtract = Subtract;
    class Multiply {
        constructor(left, right) {
            this.left = left;
            this.right = right;
        }
        visit(v) { return v.visitMultiply(this); }
        equals(other) {
            return other instanceof Multiply &&
                this.left.equals(other.left) &&
                this.right.equals(other.right);
        }
    }
    exports.Multiply = Multiply;
    class Divide {
        constructor(left, right) {
            this.left = left;
            this.right = right;
        }
        visit(v) { return v.visitDivide(this); }
        equals(other) {
            return other instanceof Divide &&
                this.left.equals(other.left) &&
                this.right.equals(other.right);
        }
    }
    exports.Divide = Divide;
    class Call {
        constructor(callee, args) {
            this.callee = callee;
            this.args = args;
        }
        visit(v) { return v.visitCall(this); }
        equals(other) {
            return other instanceof Call &&
                this.callee === other.callee &&
                this.args.length === other.args.length &&
                this.args.every((arg, i) => arg.equals(other.args[i]));
        }
    }
    exports.Call = Call;
    class ArrayLiteral {
        constructor(args) {
            this.args = args;
        }
        visit(v) { return v.visitArrayLiteral(this); }
        equals(other) {
            return other instanceof ArrayLiteral &&
                this.args.length === other.args.length &&
                this.args.every((arg, i) => arg.equals(other.args[i]));
        }
    }
    exports.ArrayLiteral = ArrayLiteral;
    class ArrayLookup {
        constructor(array, index) {
            this.array = array;
            this.index = index;
        }
        visit(v) { return v.visitArrayLookup(this); }
        equals(other) {
            return other instanceof ArrayLookup &&
                this.array.equals(other.array) &&
                this.index.equals(other.index);
        }
    }
    exports.ArrayLookup = ArrayLookup;
    class Exit {
        constructor(term) {
            this.term = term;
        }
        visit(v) { return v.visitExit(this); }
        equals(other) {
            return other instanceof Exit &&
                this.term.equals(other.term);
        }
    }
    exports.Exit = Exit;
    class Block {
        constructor(statements) {
            this.statements = statements;
        }
        visit(v) { return v.visitBlock(this); }
        equals(other) {
            return other instanceof Block &&
                this.statements.length === other.statements.length &&
                this.statements.every((statement, i) => statement.equals(other.statements[i]));
        }
    }
    exports.Block = Block;
    class If {
        constructor(conditional, consequence, alternative) {
            this.conditional = conditional;
            this.consequence = consequence;
            this.alternative = alternative;
        }
        visit(v) { return v.visitIf(this); }
        equals(other) {
            return other instanceof If &&
                this.conditional.equals(other.conditional) &&
                this.consequence.equals(other.consequence) &&
                this.alternative.equals(other.alternative);
        }
    }
    exports.If = If;
    class Function {
        constructor(name, signature, body) {
            this.name = name;
            this.signature = signature;
            this.body = body;
        }
        visit(v) { return v.visitFunction(this); }
        equals(other) {
            return other instanceof Function &&
                this.name === other.name &&
                this.signature.equals(other.signature) &&
                this.body.equals(other.body);
        }
    }
    exports.Function = Function;
    class Id {
        constructor(value) {
            this.value = value;
        }
        visit(v) { return v.visitId(this); }
        equals(other) {
            return other instanceof Id &&
                this.value === other.value;
        }
    }
    exports.Id = Id;
    class Return {
        constructor(term) {
            this.term = term;
        }
        visit(v) { return v.visitReturn(this); }
        equals(other) {
            return other instanceof Return &&
                this.term.equals(other.term);
        }
    }
    exports.Return = Return;
    class While {
        constructor(conditional, body) {
            this.conditional = conditional;
            this.body = body;
        }
        visit(v) { return v.visitWhile(this); }
        equals(other) {
            return other instanceof While &&
                this.conditional.equals(other.conditional) &&
                this.body.equals(other.body);
        }
    }
    exports.While = While;
    class Assign {
        constructor(name, value) {
            this.name = name;
            this.value = value;
        }
        visit(v) { return v.visitAssign(this); }
        equals(other) {
            return other instanceof Assign &&
                this.name === other.name &&
                this.value.equals(other.value);
        }
    }
    exports.Assign = Assign;
    class Var {
        constructor(name, value) {
            this.name = name;
            this.value = value;
        }
        visit(v) { return v.visitVar(this); }
        equals(other) {
            return other instanceof Var &&
                this.name === other.name &&
                this.value.equals(other.value);
        }
    }
    exports.Var = Var;
});
define("ast-traversal", ["require", "exports", "ast"], function (require, exports, ast_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ASTTraversal = void 0;
    class ASTTraversal {
        visitMain(node) {
            let statements = node.statements.map((statement) => statement.visit(this));
            return new ast_1.Main(statements);
        }
        visitAssert(node) {
            let condition = node.condition.visit(this);
            return new ast_1.Assert(condition);
        }
        visitLength(node) {
            let array = node.array.visit(this);
            return new ast_1.Length(array);
        }
        visitNumber(node) {
            return new ast_1.Number(node.value);
        }
        visitBoolean(node) {
            return new ast_1.Boolean(node.value);
        }
        visitUndefined(node) {
            return new ast_1.Undefined();
        }
        visitNot(node) {
            let term = node.term.visit(this);
            return new ast_1.Not(term);
        }
        visitEqual(node) {
            let left = node.left.visit(this);
            let right = node.right.visit(this);
            return new ast_1.Equal(left, right);
        }
        visitNotEqual(node) {
            let left = node.left.visit(this);
            let right = node.right.visit(this);
            return new ast_1.NotEqual(left, right);
        }
        visitAdd(node) {
            let left = node.left.visit(this);
            let right = node.right.visit(this);
            return new ast_1.Add(left, right);
        }
        visitSubtract(node) {
            let left = node.left.visit(this);
            let right = node.right.visit(this);
            return new ast_1.Subtract(left, right);
        }
        visitMultiply(node) {
            let left = node.left.visit(this);
            let right = node.right.visit(this);
            return new ast_1.Multiply(left, right);
        }
        visitDivide(node) {
            let left = node.left.visit(this);
            let right = node.right.visit(this);
            return new ast_1.Divide(left, right);
        }
        visitCall(node) {
            let args = node.args.map((arg) => arg.visit(this));
            return new ast_1.Call(node.callee, args);
        }
        visitArrayLiteral(node) {
            let args = node.args.map((arg) => arg.visit(this));
            return new ast_1.ArrayLiteral(args);
        }
        visitArrayLookup(node) {
            let array = node.array.visit(this);
            let index = node.index.visit(this);
            return new ast_1.ArrayLookup(array, index);
        }
        visitExit(node) {
            let term = node.term.visit(this);
            return new ast_1.Exit(term);
        }
        visitBlock(node) {
            let statements = node.statements.map((statement) => statement.visit(this));
            return new ast_1.Block(statements);
        }
        visitIf(node) {
            let conditional = node.conditional.visit(this);
            let consequence = node.consequence.visit(this);
            let alternative = node.alternative.visit(this);
            return new ast_1.If(conditional, consequence, alternative);
        }
        visitFunction(node) {
            let body = node.body.visit(this);
            return new ast_1.Function(node.name, node.signature, body);
        }
        visitId(node) {
            return new ast_1.Id(node.value);
        }
        visitReturn(node) {
            let term = node.term.visit(this);
            return new ast_1.Return(term);
        }
        visitWhile(node) {
            let conditional = node.conditional.visit(this);
            let body = node.body.visit(this);
            return new ast_1.While(conditional, body);
        }
        visitAssign(node) {
            let value = node.value.visit(this);
            return new ast_1.Assign(node.name, value);
        }
        visitVar(node) {
            let value = node.value.visit(this);
            return new ast_1.Var(node.name, value);
        }
    }
    exports.ASTTraversal = ASTTraversal;
});
define("optimizer", ["require", "exports", "ast", "ast-traversal"], function (require, exports, ast_2, ast_traversal_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Optimizer = void 0;
    class Optimizer extends ast_traversal_1.ASTTraversal {
        constructor(constants) {
            super();
            this.constants = constants;
        }
        visitAdd(node) {
            let left = node.left.visit(this);
            let right = node.right.visit(this);
            if (left instanceof ast_2.Number && right instanceof ast_2.Number) {
                return new ast_2.Number(left.value + right.value);
            }
            return new ast_2.Add(left, right);
        }
        visitId(node) {
            let constant = this.constants.get(node.value);
            if (constant) {
                return constant;
            }
            return new ast_2.Id(node.value);
        }
        visitIf(node) {
            let conditional = node.conditional.visit(this);
            let consequence = node.consequence.visit(this);
            this.constants.clear();
            let alternative = node.alternative.visit(this);
            this.constants.clear();
            return new ast_2.If(conditional, consequence, alternative);
        }
        visitFunction(node) {
            let visitor = new Optimizer(new Map());
            let body = node.body.visit(visitor);
            return new ast_2.Function(node.name, node.signature, body);
        }
        visitAssign(node) {
            let value = node.value.visit(this);
            if (value instanceof ast_2.Number) {
                this.constants.set(node.name, value);
            }
            else {
                this.constants.delete(node.name);
            }
            return new ast_2.Assign(node.name, value);
        }
        visitVar(node) {
            let value = node.value.visit(this);
            if (value instanceof ast_2.Number) {
                this.constants.set(node.name, value);
            }
            else {
                this.constants.delete(node.name);
            }
            return new ast_2.Var(node.name, value);
        }
    }
    exports.Optimizer = Optimizer;
});
define("parser-combinators", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Parser = exports.Source = exports.ParseResult = void 0;
    class ParseResult {
        constructor(value, source) {
            this.value = value;
            this.source = source;
        }
    }
    exports.ParseResult = ParseResult;
    class Source {
        constructor(string, index) {
            this.string = string;
            this.index = index;
        }
        match(regexp) {
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
    exports.Source = Source;
    class Parser {
        constructor(parse) {
            this.parse = parse;
        }
        /* Primitive combinators */
        static regexp(regexp) {
            return new Parser(source => source.match(regexp));
        }
        static constant(value) {
            return new Parser(source => new ParseResult(value, source));
        }
        static error(message) {
            return new Parser(source => { throw Error(source.string.slice(source.index)); });
        }
        or(parser) {
            return new Parser((source) => {
                let result = this.parse(source);
                if (result)
                    return result;
                else
                    return parser.parse(source);
            });
        }
        static zeroOrMore(parser) {
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
        bind(callback) {
            return new Parser((source) => {
                let result = this.parse(source);
                if (result) {
                    let value = result.value;
                    let source = result.source;
                    return callback(value).parse(source);
                }
                else {
                    return null;
                }
            });
        }
        /* Non-primitive, composite combinators */
        and(parser) {
            return this.bind((_) => parser);
        }
        map(callback) {
            return this.bind((value) => Parser.constant(callback(value)));
        }
        static maybe(parser) {
            return parser.or(Parser.constant(null));
        }
        parseStringToCompletion(string) {
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
    exports.Parser = Parser;
});
define("parser", ["require", "exports", "types", "ast", "parser-combinators"], function (require, exports, types_1, ast_3, parser_combinators_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parser = exports.expression = exports.statement = void 0;
    let { regexp, constant, maybe, zeroOrMore, error } = parser_combinators_1.Parser;
    let whitespace = regexp(/[ \n\r\t]+/y);
    let comments = regexp(/[/][/].*/y).or(regexp(/[/][*].*[*][/]/sy));
    let ignored = zeroOrMore(whitespace.or(comments));
    let token = (pattern) => parser_combinators_1.Parser.regexp(pattern).bind((value) => ignored.and(constant(value)));
    // Keywords
    let FUNCTION = token(/function\b/y);
    let IF = token(/if\b/y);
    let WHILE = token(/while\b/y);
    let ELSE = token(/else\b/y);
    let RETURN = token(/return\b/y);
    let VAR = token(/var\b/y);
    let TRUE = token(/true\b/y).map((_) => new ast_3.Boolean(true));
    let FALSE = token(/false\b/y).map((_) => new ast_3.Boolean(false));
    let UNDEFINED = token(/undefined\b/y).map((_) => new ast_3.Undefined());
    let VOID = token(/void\b/y).map((_) => new types_1.VoidType());
    let BOOLEAN = token(/boolean\b/y).map((_) => new types_1.BooleanType());
    let NUMBER = token(/number\b/y).map((_) => new types_1.NumberType());
    let ARRAY = token(/Array\b/y);
    let COMMA = token(/[,]/y);
    let SEMICOLON = token(/;/y);
    let COLON = token(/[:]/y);
    let LEFT_PAREN = token(/[(]/y);
    let RIGHT_PAREN = token(/[)]/y);
    let LEFT_BRACE = token(/[{]/y);
    let RIGHT_BRACE = token(/[}]/y);
    let LEFT_BRACKET = token(/\[/y);
    let RIGHT_BRACKET = token(/\]/y);
    let LESS_THAN = token(/</y);
    let GREATER_THAN = token(/>/y);
    let INTEGER = token(/[0-9]+/y).map((digits) => new ast_3.Number(parseInt(digits)));
    let boolean = TRUE.or(FALSE);
    let ID = token(/[a-zA-Z_][a-zA-Z0-9_]*/y);
    let id = ID.map((x) => new ast_3.Id(x));
    // Operators
    let NOT = token(/!/y).map((_) => ast_3.Not);
    let EQUAL = token(/==/y).map((_) => ast_3.Equal);
    let NOT_EQUAL = token(/!=/y).map((_) => ast_3.NotEqual);
    let PLUS = token(/[+]/y).map((_) => ast_3.Add);
    let MINUS = token(/[-]/y).map((_) => ast_3.Subtract);
    let STAR = token(/[*]/y).map((_) => ast_3.Multiply);
    let SLASH = token(/[\/]/y).map((_) => ast_3.Divide);
    let ASSIGN = token(/=/y).map((_) => ast_3.Assign);
    let expression = parser_combinators_1.Parser.error("expression parser used before definition");
    exports.expression = expression;
    // args <- (expression (COMMA expression)*)?
    let args = expression.bind((arg) => zeroOrMore(COMMA.and(expression)).bind((args) => constant([arg, ...args]))).or(constant([]));
    // call <- ID LEFT_PAREN args RIGHT_PAREN
    let call = ID.bind((callee) => LEFT_PAREN.and(args.bind((args) => RIGHT_PAREN.and(constant(callee === "length"
        ? new ast_3.Length(args[0])
        : callee === "assert"
            ? new ast_3.Assert(args[0])
            : new ast_3.Call(callee, args))))));
    // arrayLiteral <- LEFT_BRACKET args RIGHT_BRACKET
    let arrayLiteral = LEFT_BRACKET.and(args.bind((args) => RIGHT_BRACKET.and(constant(new ast_3.ArrayLiteral(args)))));
    // arrayLookup <- ID LEFT_BRACKET expression RIGHT_BRACKET
    let arrayLookup = id.bind((array) => LEFT_BRACKET.and(expression.bind((index) => RIGHT_BRACKET.and(constant(new ast_3.ArrayLookup(array, index))))));
    // scalar <- boolean / UNDEFINED / ID / INTEGER
    // atom <- 
    //   boolean / UNDEFINED / call / arrayLookup / ID / INTEGER / arrayLiteral / LEFT_PAREN expression RIGHT_PAREN
    let atom = boolean.or(UNDEFINED).or(call).or(arrayLookup).or(id).or(INTEGER).or(arrayLiteral).or(LEFT_PAREN.and(expression).bind((e) => RIGHT_PAREN.and(constant(e))));
    // unary <- NOT? atom
    let unary = maybe(NOT).bind((not) => atom.map((term) => not ? new ast_3.Not(term) : term));
    let infix = (operatorParser, termParser) => termParser.bind((term) => zeroOrMore(operatorParser.bind((operator) => termParser.bind((term) => constant({ operator, term })))).map((operatorTerms) => operatorTerms.reduce((left, { operator, term }) => new operator(left, term), term)));
    // product <- unary ((STAR / SLASH) unary)*
    let product = infix(STAR.or(SLASH), unary);
    // sum <- product ((PLUS / MINUS) product)*
    let sum = infix(PLUS.or(MINUS), product);
    // comparison <- sum ((EQUAL / NOT_EQUAL) sum)*
    let comparison = infix(EQUAL.or(NOT_EQUAL), sum);
    // expression <- comparison
    expression.parse = comparison.parse;
    let type = parser_combinators_1.Parser.error("type parser used before definition");
    // arrayType <- ARRAY LESS_THAN type GREATER_THAN
    let arrayType = ARRAY.and(LESS_THAN).and(type).bind((elementType) => GREATER_THAN.and(constant(new types_1.ArrayType(elementType))));
    // atomType <- VOID | BOOLEAN | NUMBER | arrayType
    let atomType = VOID.or(BOOLEAN).or(NUMBER).or(arrayType);
    // type <- atomType
    type.parse = atomType.parse;
    let statement = parser_combinators_1.Parser.error("statement parser used before definition");
    exports.statement = statement;
    // returnStatement <- RETURN expression SEMICOLON
    let returnStatement = RETURN.and(expression).bind((term) => SEMICOLON.and(constant(new ast_3.Return(term))));
    // expressionStatement <- expression SEMICOLON
    let expressionStatement = expression.bind((term) => SEMICOLON.and(constant(term)));
    // ifStatement <-
    //   IF LEFT_PAREN expression RIGHT_PAREN statement ELSE statement
    let ifStatement = IF.and(LEFT_PAREN).and(expression).bind((conditional) => RIGHT_PAREN.and(statement).bind((consequence) => ELSE.and(statement).bind((alternative) => constant(new ast_3.If(conditional, consequence, alternative)))));
    // whileStatement <-
    //   WHILE LEFT_PAREN expression RIGHT_PAREN statement
    let whileStatement = WHILE.and(LEFT_PAREN).and(expression).bind((conditional) => RIGHT_PAREN.and(statement).bind((body) => constant(new ast_3.While(conditional, body))));
    // varStatement <-
    //   VAR ID ASSIGN expression SEMICOLON
    let varStatement = VAR.and(ID).bind((name) => ASSIGN.and(expression).bind((value) => SEMICOLON.and(constant(new ast_3.Var(name, value)))));
    // assignmentStatement <- ID ASSIGN EXPRESSION SEMICOLON
    let assignmentStatement = ID.bind((name) => ASSIGN.and(expression).bind((value) => SEMICOLON.and(constant(new ast_3.Assign(name, value)))));
    // blockStatement <- LEFT_BRACE statement* RIGHT_BRACE
    let blockStatement = LEFT_BRACE.and(zeroOrMore(statement)).bind((statements) => RIGHT_BRACE.and(constant(new ast_3.Block(statements))));
    // optionalTypeAnnotation <- (COLON type)?
    let optionalTypeAnnotation = 
    // If type annotation is missing, default to integer type 
    maybe(COLON.and(type)).map((type) => type ? type : new types_1.NumberType());
    // parameter <- ID optionalTypeAnnotation 
    let parameter = ID.bind((parameter) => optionalTypeAnnotation.bind((type) => constant([parameter, type])));
    // parameters <- (parameter (COMMA parameter)*)?
    let parameters = parameter.bind((param) => zeroOrMore(COMMA.and(parameter)).bind((params) => constant([param, ...params]))).or(constant([]));
    // functionStatement <-
    //   FUNCTION ID LEFT_PAREN parameters RIGHT_PAREN optionalTypeAnnotation blockStatement
    let functionStatement = FUNCTION.and(ID).bind((name) => LEFT_PAREN.and(parameters).bind((parameters) => RIGHT_PAREN.and(optionalTypeAnnotation).bind((returnType) => blockStatement.bind((block) => constant(name === '__main'
        ? new ast_3.Main(block.statements)
        : new ast_3.Function(name, new types_1.FunctionType(new Map(parameters), returnType), block))))));
    // statement <- returnStatement 
    //            / ifStatement 
    //            / whileStatement 
    //            / varStatement 
    //            / assignmentStatement 
    //            / blockStatement
    //            / functionStatement
    //            / expressionStatement 
    let statementParser = returnStatement
        .or(functionStatement)
        .or(ifStatement)
        .or(whileStatement)
        .or(varStatement)
        .or(assignmentStatement)
        .or(blockStatement)
        .or(expressionStatement);
    statement.parse = statementParser.parse;
    let parser = ignored.and(zeroOrMore(statement)).map((statements) => new ast_3.Block(statements));
    exports.parser = parser;
});
define("type-checker", ["require", "exports", "types"], function (require, exports, types_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TypeChecker = void 0;
    function assertType(expected, got) {
        if (!expected.equals(got)) {
            throw Error(`Type error: expected ${expected}, but got ${got}`);
        }
    }
    class TypeChecker {
        constructor(locals = new Map(), functions = new Map(), currentFunctionReturnType = null) {
            this.locals = locals;
            this.functions = functions;
            this.currentFunctionReturnType = currentFunctionReturnType;
        }
        visitMain(node) {
            node.statements.forEach((statement) => statement.visit(this));
            return new types_2.VoidType();
        }
        visitAssert(node) {
            assertType(new types_2.BooleanType(), node.condition.visit(this));
            return new types_2.VoidType();
        }
        visitLength(node) {
            let type = node.array.visit(this);
            if (type instanceof types_2.ArrayType) {
                return new types_2.NumberType();
            }
            else {
                throw Error(`Type error: expected an array, but got ${type}`);
            }
        }
        visitNumber(node) {
            return new types_2.NumberType();
        }
        visitBoolean(node) {
            return new types_2.BooleanType();
        }
        visitUndefined(node) {
            return new types_2.VoidType();
        }
        visitNot(node) {
            assertType(new types_2.BooleanType(), node.term.visit(this));
            return new types_2.BooleanType();
        }
        visitEqual(node) {
            let leftType = node.left.visit(this);
            let rightType = node.right.visit(this);
            assertType(leftType, rightType);
            return new types_2.BooleanType();
        }
        visitNotEqual(node) {
            let leftType = node.left.visit(this);
            let rightType = node.right.visit(this);
            assertType(leftType, rightType);
            return new types_2.BooleanType();
        }
        visitAdd(node) {
            assertType(new types_2.NumberType(), node.left.visit(this));
            assertType(new types_2.NumberType(), node.right.visit(this));
            return new types_2.NumberType();
        }
        visitSubtract(node) {
            assertType(new types_2.NumberType(), node.left.visit(this));
            assertType(new types_2.NumberType(), node.right.visit(this));
            return new types_2.NumberType();
        }
        visitMultiply(node) {
            assertType(new types_2.NumberType(), node.left.visit(this));
            assertType(new types_2.NumberType(), node.right.visit(this));
            return new types_2.NumberType();
        }
        visitDivide(node) {
            assertType(new types_2.NumberType(), node.left.visit(this));
            assertType(new types_2.NumberType(), node.right.visit(this));
            return new types_2.NumberType();
        }
        visitCall(node) {
            let expected = this.functions.get(node.callee);
            if (!expected) {
                throw TypeError(`Function ${node.callee} is not defined`);
            }
            let argsTypes = new Map();
            node.args.forEach((arg, i) => argsTypes.set(`x${i}`, arg.visit(this)));
            let got = new types_2.FunctionType(argsTypes, expected.returnType);
            assertType(expected, got);
            return expected.returnType;
        }
        visitArrayLiteral(node) {
            if (node.args.length == 0) {
                throw TypeError("Can't infer type of an empty array");
            }
            let argsTypes = node.args.map((arg) => arg.visit(this));
            // Assert all arguments have the same type, pairwise
            let elementType = argsTypes.reduce((prev, next) => {
                assertType(prev, next);
                return prev;
            });
            return new types_2.ArrayType(elementType);
        }
        visitArrayLookup(node) {
            assertType(new types_2.NumberType(), node.index.visit(this));
            let type = node.array.visit(this);
            if (type instanceof types_2.ArrayType) {
                return type.element;
            }
            else {
                throw TypeError(`Expected an array, but got ${type}`);
            }
        }
        visitExit(node) {
            assertType(new types_2.NumberType(), node.term.visit(this));
            return new types_2.VoidType();
        }
        visitBlock(node) {
            node.statements.forEach((statement) => statement.visit(this));
            return new types_2.VoidType();
        }
        visitIf(node) {
            node.conditional.visit(this);
            node.consequence.visit(this);
            node.alternative.visit(this);
            return new types_2.VoidType();
        }
        visitFunction(node) {
            if (this.currentFunctionReturnType) {
                throw Error("Nexted functions are not supported");
            }
            this.functions.set(node.name, node.signature);
            let visitor = new TypeChecker(new Map(node.signature.parameters), this.functions, node.signature.returnType);
            node.body.visit(visitor);
            return new types_2.VoidType();
        }
        visitId(node) {
            let type = this.locals.get(node.value);
            if (!type) {
                throw TypeError(`Undefined variable ${node.value}`);
            }
            return type;
        }
        visitReturn(node) {
            let type = node.term.visit(this);
            if (this.currentFunctionReturnType) {
                assertType(this.currentFunctionReturnType, type);
                return new types_2.VoidType();
            }
            else {
                throw Error("Encountered return statement outside any function");
            }
        }
        visitWhile(node) {
            node.conditional.visit(this);
            node.body.visit(this);
            return new types_2.VoidType();
        }
        visitAssign(node) {
            let variableType = this.locals.get(node.name);
            if (!variableType) {
                throw TypeError(`Assignment to an undefined variable ${node.name}`);
            }
            let valueType = node.value.visit(this);
            assertType(variableType, valueType);
            return new types_2.VoidType();
        }
        visitVar(node) {
            let type = node.value.visit(this);
            this.locals.set(node.name, type);
            return new types_2.VoidType();
        }
    }
    exports.TypeChecker = TypeChecker;
});
define("code-generator", ["require", "exports", "ast"], function (require, exports, ast_4) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.reset = exports.setEmitFunction = exports.CodeGeneratorDynamicTyping = exports.CodeGenerator = void 0;
    let emit = console.log;
    class Label {
        constructor() {
            this.value = Label.counter++;
        }
        toString() {
            return `.L${this.value}`;
        }
    }
    Label.counter = 0;
    class CodeGenerator {
        constructor(locals = new Map(), nextLocalOffset = 0) {
            this.locals = locals;
            this.nextLocalOffset = nextLocalOffset;
        }
        visitMain(node) {
            emit(`.global main`);
            emit(`main:`);
            emit(`  push {fp, lr}`);
            emit(`  mov fp, sp`);
            node.statements.forEach((statement) => statement.visit(this));
            emit(`  mov sp, fp`);
            emit(`  mov r0, #0`);
            emit(`  pop {fp, pc}`);
        }
        visitAssert(node) {
            node.condition.visit(this);
            emit(`  cmp r0, #1`);
            emit(`  moveq r0, #'.'`);
            emit(`  movne r0, #'F'`);
            emit(`  bl putchar`);
        }
        visitLength(node) {
            node.array.visit(this);
            emit(`  ldr r0, [r0, #0]`);
        }
        visitNumber(node) {
            emit(`  ldr r0, =${node.value}`);
        }
        visitBoolean(node) {
            new ast_4.Number(node.value ? 1 : 0).visit(this);
        }
        visitUndefined(node) {
            new ast_4.Number(0).visit(this);
        }
        visitNot(node) {
            node.term.visit(this);
            emit(`  cmp r0, #0`);
            emit(`  moveq r0, #1`);
            emit(`  movne r0, #0`);
        }
        visitEqual(node) {
            node.left.visit(this);
            emit(`  push {r0, ip}`);
            node.right.visit(this);
            emit(`  pop {r1, ip}`);
            emit(`  cmp r0, r1`);
            emit(`  moveq r0, #1`);
            emit(`  movne r0, #0`);
        }
        visitNotEqual(node) {
            node.left.visit(this);
            emit(`  push {r0, ip}`);
            node.right.visit(this);
            emit(`  pop {r1, ip}`);
            emit(`  cmp r0, r1`);
            emit(`  movne r0, #1`);
            emit(`  moveq r0, #0`);
        }
        visitAdd(node) {
            node.left.visit(this);
            emit(`  push {r0, ip}`);
            node.right.visit(this);
            emit(`  pop {r1, ip}`);
            emit(`  add r0, r1, r0`);
        }
        visitSubtract(node) {
            node.left.visit(this);
            emit(`  push {r0, ip}`);
            node.right.visit(this);
            emit(`  pop {r1, ip}`);
            emit(`  sub r0, r1, r0`);
        }
        visitMultiply(node) {
            node.left.visit(this);
            emit(`  push {r0, ip}`);
            node.right.visit(this);
            emit(`  pop {r1, ip}`);
            emit(`  mul r0, r1, r0`);
        }
        visitDivide(node) {
            node.left.visit(this);
            emit(`  push {r0, ip}`);
            node.right.visit(this);
            emit(`  pop {r1, ip}`);
            emit(`  udiv r0, r1, r0`);
        }
        visitCall(node) {
            let count = node.args.length;
            if (count === 0) {
                emit(`  bl ${node.callee}`);
            }
            else if (count === 1) {
                node.args[0].visit(this);
                emit(`  bl ${node.callee}`);
            }
            else if (count >= 2 && count <= 4) {
                emit(`  sub sp, sp, #16`);
                node.args.forEach((arg, i) => {
                    arg.visit(this);
                    emit(`  str r0, [sp, #${4 * i}]`);
                });
                emit(`  pop {r0, r1, r2, r3}`);
                emit(`  bl ${node.callee}`);
            }
            else {
                throw Error("More than 4 arguments are not supported");
            }
        }
        visitArrayLiteral(node) {
            emit(`  ldr r0, =${4 * (node.args.length + 1)}`);
            emit(`  bl malloc`);
            emit(`  push {r4, ip}`);
            emit(`  mov r4, r0`);
            emit(`  ldr r0, =${node.args.length}`);
            emit(`  str r0, [r4]`);
            node.args.forEach((arg, i) => {
                arg.visit(this);
                emit(`  str r0, [r4, #${4 * (i + 1)}]`);
            });
            emit(`  mov r0, r4`);
            emit(`  pop {r4, ip}`);
        }
        //visitArrayLookup(node: ArrayLookup) {
        //  node.array.visit(this);
        //  emit(`  push {r0, ip}`);
        //  node.index.visit(this);
        //  emit(`  pop {r1, ip}`);
        //  // r0 => index, r1 => array, r2 => array length
        //  emit(`  ldr r2, [r1], #4`);
        //  emit(`  cmp r0, r2`);
        //  emit(`  movhs r0, #0`);
        //  emit(`  ldrlo r0, [r1, +r0, lsl #2]`);
        //}
        visitArrayLookup(node) {
            node.array.visit(this);
            emit(`  push {r0, ip}`);
            node.index.visit(this);
            emit(`  pop {r1, ip}`);
            // r0 => index, r1 => array, r2 => array length
            emit(`  ldr r2, [r1]`);
            emit(`  cmp r0, r2`);
            emit(`  movhs r0, #0`);
            emit(`  addlo r1, r1, #4`);
            emit(`  lsllo r0, r0, #2`);
            emit(`  ldrlo r0, [r1, r0]`);
        }
        visitExit(node) {
            let syscallNumber = 1;
            emit(`  mov r0, #0`);
            emit(`  bl fflush`);
            node.term.visit(this);
            emit(`  mov r7, #${syscallNumber}`);
            emit(`  swi #0`);
        }
        visitBlock(node) {
            node.statements.forEach((statement) => statement.visit(this));
        }
        visitIf(node) {
            let ifFalseLabel = new Label();
            let endIfLabel = new Label();
            node.conditional.visit(this);
            emit(`  cmp r0, #0`);
            emit(`  beq ${ifFalseLabel}`);
            node.consequence.visit(this);
            emit(`  b ${endIfLabel}`);
            emit(`${ifFalseLabel}:`);
            node.alternative.visit(this);
            emit(`${endIfLabel}:`);
        }
        visitFunction(node) {
            if (node.signature.parameters.size > 4)
                throw Error("More than 4 params is not supported");
            emit(``);
            emit(`.global ${node.name}`);
            emit(`${node.name}:`);
            // Prologue
            emit(`  push {fp, lr}`);
            emit(`  mov fp, sp`);
            emit(`  push {r0, r1, r2, r3}`);
            let locals = new Map();
            let parameters = Array.from(node.signature.parameters.keys());
            parameters.forEach((parameter, i) => {
                locals.set(parameter, 4 * i - 16);
            });
            let visitor = new CodeGenerator(locals, -20);
            node.body.visit(visitor);
            // Epilogue
            emit(`  mov sp, fp`);
            emit(`  mov r0, #0`);
            emit(`  pop {fp, pc}`);
        }
        visitId(node) {
            let offset = this.locals.get(node.value);
            if (offset) {
                emit(`  ldr r0, [fp, #${offset}]`);
            }
            else {
                console.log(this);
                throw Error(`Undefined variable: ${node.value}`);
            }
        }
        visitReturn(node) {
            node.term.visit(this);
            emit(`  mov sp, fp`);
            emit(`  pop {fp, pc}`);
        }
        visitWhile(node) {
            let loopStart = new Label();
            let loopEnd = new Label();
            emit(`${loopStart}:`);
            node.conditional.visit(this);
            emit(`  cmp r0, #0`);
            emit(`  beq ${loopEnd}`);
            node.body.visit(this);
            emit(`  b ${loopStart}`);
            emit(`${loopEnd}:`);
        }
        visitAssign(node) {
            node.value.visit(this);
            let offset = this.locals.get(node.name);
            if (offset) {
                emit(`  str r0, [fp, #${offset}]`);
            }
            else {
                throw Error(`Undefined variable: ${node.name}`);
            }
        }
        visitVar(node) {
            node.value.visit(this);
            emit(`  push {r0, ip}`);
            this.locals.set(node.name, this.nextLocalOffset - 4);
            this.nextLocalOffset -= 8;
        }
    }
    exports.CodeGenerator = CodeGenerator;
    let trueBitPattern = 0b111;
    let falseBitPattern = 0b110;
    let undefinedBitPattern = 0b010;
    let toSmallInteger = (n) => n << 2;
    let tagBitMask = 0b11;
    let falsyTag = 0b10;
    let pointerTag = 0b01;
    class CodeGeneratorDynamicTyping {
        constructor(locals = new Map(), nextLocalOffset = 0) {
            this.locals = locals;
            this.nextLocalOffset = nextLocalOffset;
        }
        visitMain(node) {
        }
        emitCompareFalsy() {
            emit(`  cmp r0, #0`);
            emit(`  andne r0, r0, #${tagBitMask}`);
            emit(`  cmpne r0, #${falsyTag}`);
        }
        visitAssert(node) {
            node.condition.visit(this);
            this.emitCompareFalsy();
            emit(`  movne r0, #'.'`);
            emit(`  moveq r0, #'F'`);
            emit(`  bl putchar`);
            emit(`  mov r0, #${undefinedBitPattern}`);
        }
        visitLength(node) {
            node.array.visit(this);
            emit(`  ldr r0, [r0, #-1]`);
        }
        visitNumber(node) {
            emit(`  ldr r0, =${toSmallInteger(node.value)}`);
        }
        visitBoolean(node) {
            if (node.value) {
                emit(`  mov r0, #${trueBitPattern}`);
            }
            else {
                emit(`  mov r0, #${falseBitPattern}`);
            }
        }
        visitUndefined(node) {
            emit(`  mov r0, #${undefinedBitPattern}`);
        }
        visitNot(node) {
            node.term.visit(this);
            this.emitCompareFalsy();
            emit(`  moveq r0, #${trueBitPattern}`);
            emit(`  movne r0, #${falseBitPattern}`);
        }
        visitEqual(node) {
            node.left.visit(this);
            emit(`  push {r0, ip}`);
            node.right.visit(this);
            emit(`  pop {r1, ip}`);
            emit(`  cmp r0, r1`);
            emit(`  moveq r0, #${trueBitPattern}`);
            emit(`  movne r0, #${falseBitPattern}`);
        }
        visitNotEqual(node) {
            node.left.visit(this);
            emit(`  push {r0, ip}`);
            node.right.visit(this);
            emit(`  pop {r1, ip}`);
            emit(`  cmp r0, r1`);
            emit(`  movne r0, #${trueBitPattern}`);
            emit(`  moveq r0, #${falseBitPattern}`);
        }
        visitAdd(node) {
            node.left.visit(this);
            emit(`  push {r0, ip}`);
            node.right.visit(this);
            emit(`  pop {r1, ip}`);
            // Are both small integers?
            emit(`  orr r2, r0, r1`);
            emit(`  and r2, r2, #${tagBitMask}`);
            emit(`  cmp r2, #0`);
            emit(`  addeq r0, r1, r0`);
            emit(`  movne r0, #${undefinedBitPattern}`);
        }
        visitSubtract(node) {
            node.left.visit(this);
            emit(`  push {r0, ip}`);
            node.right.visit(this);
            emit(`  pop {r1, ip}`);
            // Are both small integers?
            emit(`  orr r2, r0, r1`);
            emit(`  and r2, r2, #${tagBitMask}`);
            emit(`  cmp r2, #0`);
            emit(`  subeq r0, r1, r0`);
            emit(`  movne r0, #${undefinedBitPattern}`);
        }
        visitMultiply(node) {
            node.left.visit(this);
            emit(`  push {r0, ip}`);
            node.right.visit(this);
            emit(`  pop {r1, ip}`);
            // Are both small integers?
            emit(`  orr r2, r0, r1`);
            emit(`  and r2, r2, #${tagBitMask}`);
            emit(`  cmp r2, #0`);
            emit(`  muleq r0, r1, r0`);
            emit(`  lsreq r0, r0, #2`);
            emit(`  movne r0, #${undefinedBitPattern}`);
        }
        visitDivide(node) {
            throw Error("Not implemented: division");
            // emit(`  udiv r0, r1, r0`);
        }
        visitCall(node) {
            let count = node.args.length;
            if (count === 0) {
                emit(`  bl ${node.callee}`);
            }
            else if (count === 1) {
                node.args[0].visit(this);
                emit(`  bl ${node.callee}`);
            }
            else if (count >= 2 && count <= 4) {
                emit(`  sub sp, sp, #16`);
                node.args.forEach((arg, i) => {
                    arg.visit(this);
                    emit(`  str r0, [sp, #${4 * i}]`);
                });
                emit(`  pop {r0, r1, r2, r3}`);
                emit(`  bl ${node.callee}`);
            }
            else {
                throw Error("More than 4 arguments are not supported");
            }
        }
        visitArrayLiteral(node) {
            emit(`  ldr r0, =${4 * (node.args.length + 1)}`);
            emit(`  bl malloc`);
            emit(`  push {r4, ip}`);
            emit(`  mov r4, r0`);
            emit(`  ldr r0, =${toSmallInteger(node.args.length)}`);
            emit(`  str r0, [r4]`);
            node.args.forEach((arg, i) => {
                arg.visit(this);
                emit(`  str r0, [r4, #${4 * (i + 1)}]`);
            });
            emit(`  add r0, r4, #1`); // Move to r0 and add tag
            emit(`  pop {r4, ip}`);
        }
        //  visitArrayLookup(node: ArrayLookup) {
        //    node.array.visit(this);
        //    emit(`  bic r0, r0, #${pointerTag}`); // Remove tag
        //    emit(`  push {r0, ip}`);
        //    node.index.visit(this);
        //    emit(`  pop {r1, ip}`);
        //    // r0 => index, r1 => array, r2 => array length
        //    emit(`  ldr r2, [r1], #4`);
        //    emit(`  cmp r0, r2`);
        //    emit(`  movhs r0, #${undefinedBitPattern}`);
        //    emit(`  ldrlo r0, [r1, r0]`);
        //  }
        //
        visitArrayLookup(node) {
            node.array.visit(this);
            emit(`  bic r0, r0, #${pointerTag}`); // Remove tag
            emit(`  push {r0, ip}`);
            node.index.visit(this);
            emit(`  pop {r1, ip}`);
            // r0 => index, r1 => array, r2 => array length
            emit(`  ldr r2, [r1], #4`);
            emit(`  cmp r0, r2`);
            emit(`  movhs r0, #${undefinedBitPattern}`);
            emit(`  ldrlo r0, [r1, r0]`);
        }
        visitExit(node) {
            let syscallNumber = 1;
            emit(`  mov r0, #0`);
            emit(`  bl fflush`);
            node.term.visit(this);
            emit(`  lsr r0, r0, #2`);
            emit(`  mov r7, #${syscallNumber}`);
            emit(`  swi #0`);
        }
        visitBlock(node) {
            node.statements.forEach((statement) => statement.visit(this));
        }
        visitIf(node) {
            let ifFalseLabel = new Label();
            let endIfLabel = new Label();
            node.conditional.visit(this);
            this.emitCompareFalsy();
            emit(`  beq ${ifFalseLabel}`);
            node.consequence.visit(this);
            emit(`  b ${endIfLabel}`);
            emit(`${ifFalseLabel}:`);
            node.alternative.visit(this);
            emit(`${endIfLabel}:`);
        }
        visitFunction(node) {
            if (node.signature.parameters.size > 4)
                throw Error("More than 4 params is not supported");
            emit(``);
            emit(`.global ${node.name}`);
            emit(`${node.name}:`);
            // Prologue
            emit(`  push {fp, lr}`);
            emit(`  mov fp, sp`);
            emit(`  push {r0, r1, r2, r3}`);
            let locals = new Map();
            let parameters = Array.from(node.signature.parameters.keys());
            parameters.forEach((parameter, i) => {
                locals.set(parameter, 4 * i - 16);
            });
            let visitor = new CodeGeneratorDynamicTyping(locals, -20);
            node.body.visit(visitor);
            // Epilogue
            emit(`  mov sp, fp`);
            emit(`  mov r0, #${undefinedBitPattern}`);
            emit(`  pop {fp, pc}`);
        }
        visitId(node) {
            let offset = this.locals.get(node.value);
            if (offset) {
                emit(`  ldr r0, [fp, #${offset}]`);
            }
            else {
                console.log(this);
                throw Error(`Undefined variable: ${node.value}`);
            }
        }
        visitReturn(node) {
            node.term.visit(this);
            emit(`  mov sp, fp`);
            emit(`  pop {fp, pc}`);
        }
        visitWhile(node) {
            let loopStart = new Label();
            let loopEnd = new Label();
            emit(`${loopStart}:`);
            node.conditional.visit(this);
            this.emitCompareFalsy();
            emit(`  beq ${loopEnd}`);
            node.body.visit(this);
            emit(`  b ${loopStart}`);
            emit(`${loopEnd}:`);
        }
        visitAssign(node) {
            node.value.visit(this);
            let offset = this.locals.get(node.name);
            if (offset) {
                emit(`  str r0, [fp, #${offset}]`);
            }
            else {
                throw Error(`Undefined variable: ${node.name}`);
            }
        }
        visitVar(node) {
            node.value.visit(this);
            emit(`  push {r0, ip}`);
            this.locals.set(node.name, this.nextLocalOffset - 4);
            this.nextLocalOffset -= 8;
        }
    }
    exports.CodeGeneratorDynamicTyping = CodeGeneratorDynamicTyping;
    function setEmitFunction(emitFunction) {
        emit = emitFunction;
    }
    exports.setEmitFunction = setEmitFunction;
    function reset() {
        Label.counter = 0;
    }
    exports.reset = reset;
});
define("test", ["require", "exports", "types", "ast", "code-generator", "ast-traversal", "optimizer", "parser-combinators", "parser"], function (require, exports, types_3, ast_5, code_generator_1, ast_traversal_2, optimizer_1, parser_combinators_2, parser_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let test = (name, callback) => callback();
    test("Source matching is idempotent", () => {
        let s = new parser_combinators_2.Source('  let', 2);
        let result1 = s.match(/let/y);
        console.assert(result1 !== null && result1.value === 'let' && result1.source.index === 5);
        let result2 = s.match(/let/y);
        console.assert(result2 !== null && result2.value === 'let' && result2.source.index === 5);
    });
    let { regexp, constant, maybe, zeroOrMore, error } = parser_combinators_2.Parser;
    test("Parsing alternatives with `or`", () => {
        let parser = regexp(/bye/y).or(regexp(/hai/y));
        let result = parser.parseStringToCompletion('hai');
        console.assert(result == 'hai');
    });
    test("Parsing with bindings", () => {
        let parser = regexp(/[a-z]+/y).bind((word) => regexp(/[0-9]+/y).bind((digits) => constant(`first ${word}, then ${digits}`)));
        let result = parser.parseStringToCompletion('hai123');
        console.assert(result == 'first hai, then 123');
    });
    test("Expression parser", () => {
        console.log();
        let [x, y, z] = [new ast_5.Id('x'), new ast_5.Id('y'), new ast_5.Id('z')];
        let parse = (s) => parser_1.expression.parseStringToCompletion(s);
        console.assert(parse('x + y + z').equals(new ast_5.Add(new ast_5.Add(x, y), z)));
        console.assert(parse('x + y * z').equals(new ast_5.Add(x, new ast_5.Multiply(y, z))));
        console.assert(parse('x * y + z').equals(new ast_5.Add(new ast_5.Multiply(x, y), z)));
        console.assert(parse('(x + y) * z').equals(new ast_5.Multiply(new ast_5.Add(x, y), z)));
        console.assert(parse('x == y + z').equals(new ast_5.Equal(x, new ast_5.Add(y, z))));
        console.assert(parse('x + y == z').equals(new ast_5.Equal(new ast_5.Add(x, y), z)));
        console.assert(parse('f()').equals(new ast_5.Call('f', [])));
        console.assert(parse('f(x)').equals(new ast_5.Call('f', [x])));
        console.assert(parse('f(x, y, z)').equals(new ast_5.Call('f', [x, y, z])));
    });
    test("Statement parser", () => {
        console.log();
        let [x, y, z] = [new ast_5.Id('x'), new ast_5.Id('y'), new ast_5.Id('z')];
        let parse = (s) => parser_1.statement.parseStringToCompletion(s);
        console.assert(parse('return x;').equals(new ast_5.Return(x)));
        console.assert(parse('returnx;').equals(new ast_5.Id('returnx')));
        console.assert(parse('x + y;').equals(new ast_5.Add(x, y)));
        console.assert(parse('if (x) return y; else return z;').equals(new ast_5.If(x, new ast_5.Return(y), new ast_5.Return(z))));
        console.assert(parse('{}').equals(new ast_5.Block([])));
        console.assert(parse('{ x; y; }').equals(new ast_5.Block([x, y])));
        console.assert(parse('if (x) { return y; } else { return z; }').equals(new ast_5.If(x, new ast_5.Block([new ast_5.Return(y)]), new ast_5.Block([new ast_5.Return(z)]))));
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
        let expected = new ast_5.Block([
            new ast_5.Function("factorial", new types_3.FunctionType(new Map([["n", new types_3.NumberType()]]), new types_3.NumberType()), new ast_5.Block([
                new ast_5.Var("result", new ast_5.Number(1)),
                new ast_5.While(new ast_5.NotEqual(new ast_5.Id("n"), new ast_5.Number(1)), new ast_5.Block([
                    new ast_5.Assign("result", new ast_5.Multiply(new ast_5.Id("result"), new ast_5.Id("n"))),
                    new ast_5.Assign("n", new ast_5.Subtract(new ast_5.Id("n"), new ast_5.Number(1))),
                ])),
                new ast_5.Return(new ast_5.Id("result")),
            ])),
        ]);
        let result = parser_1.parser.parseStringToCompletion(source);
        console.assert(result.equals(expected));
    });
    let parse = (s) => parser_1.parser.parseStringToCompletion(s);
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
        let result = before.visit(new optimizer_1.Optimizer(new Map()));
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
        let ast = parser_1.parser.parseStringToCompletion(source);
        let astCopy = ast.visit(new ast_traversal_2.ASTTraversal());
        console.assert(ast.equals(astCopy));
        //let typeChecker = new TypeChecker(
        //  new Map(),
        //  new Map([
        //    ["putchar", new FunctionType(new Map([["char", new NumberType()]]), new VoidType())],
        //  ]),
        //);
        //ast.visit(typeChecker);
        let codeGenerator = new code_generator_1.CodeGeneratorDynamicTyping();
        //let codeGenerator = new CodeGenerator();
        ast.visit(codeGenerator);
    });
});

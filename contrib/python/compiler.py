from __future__ import annotations
from typing import Protocol, Generic, TypeVar, Optional, Callable
from dataclasses import dataclass
from re import Pattern, compile as re
from abc import ABCMeta, abstractmethod
from functools import reduce


T = TypeVar('T', covariant=True)
U = TypeVar('U')
S = TypeVar('S')

emit = print
test = lambda f: f()


class Error(Exception):
    """Compiler error"""


@dataclass
class ParseResult(Generic[T]):
    value: T
    source: Source


@dataclass
class Source:
    string: str
    index: int

    def match(self, regexp: Pattern) -> Optional[ParseResult[str]]:
        match = regexp.match(self.string, self.index)
        if match:
            value = match.group(0)
            source = Source(self.string, self.index + len(value))
            return ParseResult(value, source)
        return None


@test
def source_matching_is_idempotent():
    s = Source('  let', 2);
    result1 = s.match(re('let'))
    assert result1 != None and result1.value == 'let'
    assert result1 != None and result1.source.index == 5
    result2 = s.match(re('let'))
    assert result2 != None and result2.value == 'let'
    assert result2 != None and result2.source.index == 5


@dataclass
class Parser(Generic[T]):
    _parse: Callable[[Source], Optional[ParseResult[T]]]

    def parse(self, s: Source) -> Optional[ParseResult[T]]:
        return self.__dict__['_parse'](s)
    
    @staticmethod
    def regexp(regexp: Pattern) -> Parser[str]:
        return Parser(lambda source: source.match(regexp))

    @staticmethod
    def constant(value: U) -> Parser[U]:
        return Parser(lambda source: ParseResult(value, source))

    @staticmethod
    def error(message: str) -> Parser[U]:
        def error(source):
            raise Exception(message)
        return Parser(error)

    def or_(self, parser: Parser[U]) -> Parser[U]:
        def f(source: Source):
            result = self.parse(source)
            if result:
                return result 
            else:
                return parser.parse(source)
        return Parser(f)

    __or__ = or_  # (x | y) could be used instead of x.or_(y)

    @staticmethod
    def zero_or_more(parser: Parser[U]) -> Parser[list[U]]:
        def f(source: Source):
            results: list[U] = []
            while (item := parser.parse(source)):
                source = item.source
                results.append(item.value)
            return ParseResult(results, source)
        return Parser(f)

    def bind(self, callback: Callable[[T], Parser[U]]) -> Parser[U]:
        def f(source: Source):
            result = self.parse(source)
            if result:
                return callback(result.value).parse(result.source)
            else:
                return None
        return Parser(f)

    # Non-primitive, composite combinators

    def and_(self: Parser[S], parser: Parser[U]) -> Parser[U]:
        return self.bind(lambda _: parser)

    def map(self: Parser[S], callback: Callable[[S], U]) -> Parser[U]:
        return self.bind(lambda value: 
                 Parser.constant(callback(value)))

    @staticmethod
    def maybe(parser: Parser[Optional[U]]) -> Parser[Optional[U]]:
        return parser.or_(Parser.constant(None))

    def parse_string_to_completion(self, string: str) -> T:
        source = Source(string, 0)

        result = self.parse(source)
        if not result:
            raise Error("Parse error: could not parse anything at all")

        index = result.source.index
        if index != len(result.source.string):
            raise Error(f"Parse error at index {index}")

        return result.value


regexp = Parser.regexp
constant = Parser.constant
maybe = Parser.maybe
zero_or_more = Parser.zero_or_more
error = Parser.error


@test
def parsing_alternatives():
    parser = regexp(re('bye')).or_(regexp(re('hai')))
    result = parser.parse_string_to_completion('hai')
    assert result == 'hai'

@test
def parsing_with_bindings():
    parser = regexp(re('[a-z]+')).bind(lambda word:
        regexp(re('[0-9]+')).bind(lambda digits:
            constant(f"first {word}, then {digits}")))
    result = parser.parse_string_to_completion('hai123')
    assert result == 'first hai, then 123'


whitespace = regexp(re(r'[ \n\r\t]+'))
comments = regexp(re('[/][/].*')).or_(regexp(re('(?s)[/][*].*[*][/]')))
ignored = zero_or_more(whitespace.or_(comments))

def token(pattern: Pattern) -> Parser[str]:
    return regexp(pattern).bind(lambda value:
        ignored.and_(constant(value)))

FUNCTION = token(re(r'function\b'))
IF = token(re(r'if\b'))
WHILE = token(re(r'while\b'))
ELSE = token(re(r'else\b'))
RETURN = token(re(r'return\b'))
VAR = token(re(r'var\b'))

COMMA = token(re('[,]'))
SEMICOLON = token(re(';'))
LEFT_PAREN = token(re('[(]'))
RIGHT_PAREN = token(re('[)]'))
LEFT_BRACE = token(re('[{]'))
RIGHT_BRACE = token(re('[}]'))

INTEGER = token(re('[0-9]+')).map(lambda digits:
    Number(int(digits)))

ID = token(re('[a-zA-Z_][a-zA-Z0-9_]*'))

id = ID.map(lambda x: Id(x))

# Operators
NOT = token(re('!')).map(lambda _: Not)
EQUAL = token(re('==')).map(lambda _: Equal)
NOT_EQUAL = token(re('!=')).map(lambda _: NotEqual)
PLUS = token(re('[+]')).map(lambda _: Add)
MINUS = token(re('[-]')).map(lambda _: Subtract)
STAR = token(re('[*]')).map(lambda _: Multiply)
SLASH = token(re('[\/]')).map(lambda _: Divide)
ASSIGN = token(re('=')).map(lambda _: Assign)

expression: Parser[AST] = \
    Parser.error('expression parser used before definition')

# args <- (expression (COMMA expression)*)?
args: Parser[list[AST]] = expression.bind(lambda arg:
    zero_or_more(COMMA.and_(expression)).bind(lambda args:
        constant([arg] + args))).or_(constant([]))

# call <- ID LEFT_PAREN args RIGHT_PAREN
call = ID.bind(lambda callee:
    LEFT_PAREN.and_(args.bind(lambda args:
        RIGHT_PAREN.and_(constant(Call(callee, args))))))

# atom <- call / ID / INTEGER / LEFT_PAREN expression RIGHT_PAREN
atom: Parser[AST] = \
    call.or_(id).or_(INTEGER).or_(
        LEFT_PAREN.and_(expression).bind(lambda e:
            RIGHT_PAREN.and_(constant(e))))

unary: Parser[AST] = \
    maybe(NOT).bind(lambda not_:
        atom.map(lambda term: Not(term) if not_ else term))

def infix(operator_parser: Parser[Callable[[AST, AST], AST]],
          term_parser: Parser[AST]) -> Parser[AST]:
    def reducer(left, operator_term):
        operator, term = operator_term 
        return operator(left, term)
    return term_parser.bind(lambda term:
            zero_or_more(operator_parser.bind(lambda operator:
                term_parser.bind(lambda term:
                    constant((operator, term))))).map(lambda operator_terms:
                        reduce(reducer, operator_terms, term)))

# product <- unary ((STAR / SLASH) unary)*
product = infix(STAR.or_(SLASH), unary)

# sum <- product ((PLUS / MINUS) product)*
sum = infix(PLUS.or_(MINUS), product)

# comparison <- sum ((EQUAL / NOT_EQUAL) sum)*
comparison = infix(EQUAL.or_(NOT_EQUAL), sum)

# expression <- comparison
expression.__dict__['_parse'] = comparison.__dict__['_parse']


statement: Parser[AST] = \
    Parser.error("statement parser used before definition")

# return_statement <- RETURN expression SEMICOLON
return_statement: Parser[AST] = \
    RETURN.and_(expression).bind(lambda term:
        SEMICOLON.and_(constant(Return(term))))


# expression_statement <- expression SEMICOLON
expression_statement: Parser[AST] = \
    expression.bind(lambda term: SEMICOLON.and_(constant(term)))

# if_statement <- IF LEFT_PAREN expression RIGHT_PAREN statement ELSE statement
if_statement: Parser[AST] = \
    IF.and_(LEFT_PAREN).and_(expression).bind(lambda conditional:
        RIGHT_PAREN.and_(statement).bind(lambda consequence:
            ELSE.and_(statement).bind(lambda alternative:
                constant(If(conditional, consequence, alternative)))))


# while_statement <- WHILE LEFT_PAREN expression RIGHT_PAREN statement
while_statement: Parser[AST] = \
    WHILE.and_(LEFT_PAREN).and_(expression).bind(lambda conditional:
        RIGHT_PAREN.and_(statement).bind(lambda body:
            constant(While(conditional, body))))


# var_statement <- VAR ID ASSIGN expression SEMICOLON
var_statement: Parser[AST] = \
    VAR.and_(ID).bind(lambda name:
        ASSIGN.and_(expression).bind(lambda value:
            SEMICOLON.and_(constant(Var(name, value)))))


# assignment_statement <- ID ASSIGN expression SEMICOLON
assignment_statement: Parser[AST] = \
    ID.bind(lambda name:
        ASSIGN.and_(expression).bind(lambda value:
            SEMICOLON.and_(constant(Assign(name, value)))))


# block_statement <- LEFT_BRACE statements* RIGHT_BRACE
block_statement: Parser[Block] = \
    LEFT_BRACE.and_(zero_or_more(statement)).bind(lambda statements:
        RIGHT_BRACE.and_(constant(Block(statements))))


# parameters <- (ID (COMMA ID)*)?
parameters: Parser[list[str]] = \
    ID.bind(lambda param:
        zero_or_more(COMMA.and_(ID)).bind(lambda params:
            constant([param] + params))).or_(constant([]))

# function_statement <-
#     FUNCTION ID LEFT_PAREN parameters RIGHT_PAREN
#         block_statement
function_statement: Parser[AST] = \
    FUNCTION.and_(ID).bind(lambda name:
        LEFT_PAREN.and_(parameters).bind(lambda parameters:
            RIGHT_PAREN.and_(block_statement).bind(lambda block:
                constant(Function(name, parameters, block)))))


# statement <- return_statement
#            / if_statement            
#            / while_statement            
#            / var_statement            
#            / assignment_statement            
#            / block_statement
#            / function_statement
#            / expression_statement
# TODO: order doesn't match, does it matter?
statement_parser: Parser[AST] = \
    return_statement.or_(
        function_statement).or_(
            if_statement).or_(
                while_statement).or_(
                    var_statement).or_(
                        assignment_statement).or_(
                            block_statement).or_(
                                expression_statement)

statement.__dict__['_parse'] = statement_parser.__dict__['_parse']

parser: Parser[AST] = \
    ignored.and_(zero_or_more(statement)).map(lambda statements:
        Block(statements))



class Label:
    counter = 0
    value: int

    def __init__(self):
        self.value = Label.counter
        Label.counter += 1
    
    def __str__(self):
        return f'.L{self.value}'


@dataclass
class Environment:
    locals: dict[str, int]
    next_local_offset: int


class AST(metaclass=ABCMeta):

    @abstractmethod
    def emit(self, env: Environment) -> None: pass

    # No need to define .equal() method like in TypeScript,
    # @dataclass annotation will derive .__eq__() for us,
    # so we can compare AST nodes with normal (==) operator.


@dataclass
class Main(AST):
    statements: list[AST]

    def emit(self, env: Environment):
        emit('.global main')
        emit('main:')
        emit('  push {fp, lr}')
        for statement in self.statements:
            statement.emit(env)
        emit('  mov r0, #0')
        emit('  pop {fp, pc}')


@dataclass
class Assert(AST):
    condition: AST

    def emit(self, env: Environment):
        self.condition.emit(env)
        emit('  cmp r0, #1')
        emit('  moveq r0, #"."')
        emit('  movne r0, #"F"')
        emit('  bl putchar')


@dataclass
class Number(AST):
    value: int

    def emit(self, env: Environment):
        emit(f'  ldr r0, ={self.value}')


@dataclass
class Not(AST):
    term: AST

    def emit(self, env: Environment):
        self.term.emit(env)
        emit('  cmp r0, #0')
        emit('  moveq r0, #1')
        emit('  movne r0, #0')


@dataclass
class Equal(AST):
    left: AST
    right: AST

    def emit(self, env: Environment):
        self.left.emit(env)
        emit('  push {r0, ip}')
        self.right.emit(env)
        emit('  pop {r1, ip}')
        emit('  cmp r0, r1')
        emit('  moveq r0, #1')
        emit('  movne r0, #0')


@dataclass
class NotEqual(AST):
    left: AST
    right: AST

    def emit(self, env: Environment):
        self.left.emit(env)
        emit('  push {r0, ip}')
        self.right.emit(env)
        emit('  pop {r1, ip}')
        emit('  cmp r0, r1')
        emit('  movne r0, #1')
        emit('  moveq r0, #0')


@dataclass
class Add(AST):
    left: AST
    right: AST

    def emit(self, env: Environment):
        self.left.emit(env)
        emit('  push {r0, ip}')
        self.right.emit(env)
        emit('  pop {r1, ip}')
        emit('  add r0, r1, r0')


@dataclass
class Subtract(AST):
    left: AST
    right: AST

    def emit(self, env: Environment):
        self.left.emit(env)
        emit('  push {r0, ip}')
        self.right.emit(env)
        emit('  pop {r1, ip}')
        emit('  sub r0, r1, r0')


@dataclass
class Multiply(AST):
    left: AST
    right: AST

    def emit(self, env: Environment):
        self.left.emit(env)
        emit('  push {r0, ip}')
        self.right.emit(env)
        emit('  pop {r1, ip}')
        emit('  mul r0, r1, r0')


@dataclass
class Divide(AST):
    left: AST
    right: AST

    def emit(self, env: Environment):
        self.left.emit(env)
        emit('  push {r0, ip}')
        self.right.emit(env)
        emit('  pop {r1, ip}')
        emit('  udiv r0, r1, r0')


@dataclass
class Call(AST):
    callee: str
    args: list[AST]

    def emit(self, env: Environment):
        count = len(self.args)
        if count == 0:
            emit(f'  bl {self.callee}')
        elif count == 1:
            self.args[0].emit(env)
            emit(f'  bl {self.callee}')
        elif 2 <= count <= 4:
            emit('  sub sp, sp, #16')
            for i, arg in enumerate(self.args):
                arg.emit(env)
                emit(f'  str r0, [sp, #{4 * i}]')
            emit('  pop {r0, r1, r2, r3}')
            emit(f'  bl {self.callee}')
        else:
            raise Error('More than 4 arguments are not supported')


@dataclass
class Exit(AST):
    term: AST

    def emit(self, env: Environment):
        syscall_number = 1
        emit('  mov r0, #0')
        emit('  bl fflush')
        self.term.emit(env)
        emit(f'  mov r7, #{syscall_number}')
        emit('  swi #0')


@dataclass
class Block(AST):
    statements: list[AST]

    def emit(self, env: Environment):
        for statement in self.statements:
            statement.emit(env)


@dataclass
class If(AST):
    conditional: AST
    consequence: AST
    alternative: AST

    def emit(self, env: Environment):
        if_false_label = Label()
        end_if_label = Label()
        self.conditional.emit(env)
        emit('  cmp r0, #0')
        emit(f'  beq {if_false_label}')
        self.consequence.emit(env)
        emit(f'  b {end_if_label}')
        emit(f'{if_false_label}:')
        self.alternative.emit(env)
        emit(f'{end_if_label}:')


@dataclass
class Function(AST):
    name: str
    parameters: list[str]
    body: AST

    def emit(self, _: Environment):
        if len(self.parameters) > 4:
            raise Error('More than 4 params is not supported')

        emit('')
        emit(f'.global {self.name}')
        emit(f'{self.name}:')

        self.emit_prologue()
        env = self.set_up_environment()
        self.body.emit(env)
        self.emit_epilogue()

    def emit_prologue(self):
        emit('  push {fp, lr}')
        emit('  mov fp, sp')
        emit('  push {r0, r1, r2, r3}')
        # Alternatively:
        # emit('  push {r0, r1, r2, r3, fp, lr}')
        # emit('  add fp, sp, #16')

    def set_up_environment(self):
        env = Environment({}, 0)
        for i, parameter in enumerate(self.parameters):
            env.locals[parameter] = 4 * i - 16
        env.next_local_offset = -20
        return env

    def emit_epilogue(self):
        emit('  mov sp, fp')
        emit('  mov r0, #0')
        emit('  pop {fp, pc}')


@dataclass
class Id(AST):
    value: str

    def emit(self, env: Environment):
        offset = env.locals.get(self.value)
        if offset:
            emit(f'  ldr r0, [fp, #{offset}]')
        else:
            raise Error(f'Undefined variable: {self.value}')


@dataclass
class Return(AST):
    term: AST

    def emit(self, env: Environment):
        self.term.emit(env)
        emit('  mov sp, fp')
        emit('  pop {fp, pc}')


@dataclass
class While(AST):
    conditional: AST
    body: AST

    def emit(self, env: Environment):
        loop_start = Label()
        loop_end = Label()

        emit(f'{loop_start}:')
        self.conditional.emit(env)
        emit('  cmp r0, #0')
        emit(f'  beq {loop_end}')
        self.body.emit(env)
        emit(f'  b {loop_start}')
        emit(f'{loop_end}:')


@dataclass
class Assign(AST):
    name: str
    value: AST

    def emit(self, env: Environment):
        self.value.emit(env)
        offset = env.locals.get(self.name)
        if offset:
            emit(f'  str r0, [fp, #{offset}]')
        else:
            raise Error(f'Undefined variable: {self.name}')


@dataclass
class Var(AST):
    name: str
    value: AST

    def emit(self, env: Environment):
        self.value.emit(env)
        emit('  push {r0, ip}')
        env.locals[self.name] = env.next_local_offset - 4
        env.next_local_offset -= 8;


@test
def expression_parser():
    x, y, z = Id('x'), Id('y'), Id('z')
    def parse(s: str):
        return expression.parse_string_to_completion(s)

    assert parse('x + y + z') == Add(Add(x, y), z)
    assert parse('x + y * z') == Add(x, Multiply(y, z))
    assert parse('x * y + z') == Add(Multiply(x, y), z)
    assert parse('(x + y) * z') == Multiply(Add(x, y), z)
    assert parse('x == y + z') == Equal(x, Add(y, z))
    assert parse('x + y == z') == Equal(Add(x, y), z)

    assert parse('f()') == Call('f', [])
    assert parse('f(x)') == Call('f', [x])
    assert parse('f(x, y, z)') == Call('f', [x, y, z])


@test
def statement_parser_test():
    x, y, z = Id('x'), Id('y'), Id('z')
    def parse(s: str):
        return statement.parse_string_to_completion(s)

    assert parse('return x;') == Return(x)
    assert parse('returnx;') == Id('returnx')
    assert parse('x + y;') == Add(x, y)

    assert parse('if (x) return y; else return z;') == \
            If(x, Return(y), Return(z))
    assert parse('{}') == Block([])
    assert parse('{ x; y; }') == Block([x, y])
    assert parse('if (x) { return y; } else { return z; }') == \
            If(x, Block([Return(y)]), Block([Return(z)]))

    assert parse('function id(x) { return x; }') == \
            Function('id', ['x'], Block([Return(x)]))


@test
def parser_integration_test():
    source = r"""
        function factorial(n) {
          var result = 1;
          while (n != 1) {
            result = result * n;
            n = n - 1;
          }
          return result;
        }
    """
    expected = Block([
        Function("factorial", ["n"], Block([
            Var("result", Number(1)),
            While(NotEqual(Id("n"), Number(1)), Block([
                Assign("result", Multiply(Id("result"), Id("n"))),
                Assign("n", Subtract(Id("n"), Number(1))),
            ])),
            Return(Id("result")),
        ]))
    ])

    result = parser.parse_string_to_completion(source)

    assert result == expected


@test
def end_to_end_test():
    source = r"""
        function main() {
          // Test Number
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

          putchar(10); // Newline
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
    """
    ast = parser.parse_string_to_completion(source)
    ast.emit(Environment({}, 0))


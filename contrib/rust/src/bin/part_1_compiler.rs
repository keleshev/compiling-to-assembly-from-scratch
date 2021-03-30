use std::collections::HashMap;
use std::fmt;
use std::io::{self, Write};

fn main() -> anyhow::Result<()> {
    let args = std::env::args().collect::<Vec<_>>();

    let source_path = match args.as_slice() {
        [_, source_path] => source_path,
        [command, ..] => anyhow::bail!("Usage: {} FILE", command),
        [] => anyhow::bail!("Usage: {} FILE", std::env::current_exe()?.display()),
    };

    let source = std::fs::read_to_string(source_path)?;
    let source_ast = ast_parser::program(&source)?;
    let mut env = Environment::new();

    Emitter::new(&mut io::stdout()).emit(&mut env, &source_ast)?;

    Ok(())
}

pub enum Ast {
    Main(Vec<Ast>),
    Assert(Box<Ast>),
    Number(i32),
    Not(Box<Ast>),
    Eq(Box<Ast>, Box<Ast>),
    Ne(Box<Ast>, Box<Ast>),
    Add(Box<Ast>, Box<Ast>),
    Sub(Box<Ast>, Box<Ast>),
    Mul(Box<Ast>, Box<Ast>),
    Div(Box<Ast>, Box<Ast>),
    Call(String, Vec<Ast>),
    Exit(Box<Ast>),
    Block(Vec<Ast>),
    If(Box<Ast>, Box<Ast>, Box<Ast>),
    Function(String, Vec<String>, Box<Ast>),
    Id(String),
    Return(Box<Ast>),
    While(Box<Ast>, Box<Ast>),
    Assign(String, Box<Ast>),
    Var(String, Box<Ast>),
}

peg::parser! {
    grammar ast_parser() for str {
        rule whitespace()
            = quiet!{ [' ' | '\n' | '\r' | '\t']+ }
            / expected!("whitespace")
        rule comments()
            = quiet!{ "//" (!"\n" [_])* "\n" }
            / quiet!{ "/*" (!"*/" [_])* "*/" }
            / expected!("comment")

        rule ignored() = (whitespace() / comments())+

        rule ASSERT() = "assert" ignored()
        rule FUNCTION() = "function" ignored()
        rule IF() = "if" ignored()
        rule WHILE() = "while" ignored()
        rule ELSE() = "else" ignored()
        rule RETURN() = "return" ignored()
        rule VAR() = "var" ignored()

        rule COMMA() = "," ignored()?
        rule SEMICOLON() = ";" ignored()?
        rule LEFT_PAREN() = "(" ignored()?
        rule RIGHT_PAREN() = ")" ignored()?
        rule LEFT_BRACE() = "{" ignored()?
        rule RIGHT_BRACE() = "}" ignored()?

        rule NUMBER()
            = quiet!{ ['0'..='9']+ }
            / expected!("number")

        rule ID()
            = quiet!{ ['A'..='Z' | 'a'..='z' | '_'] ['A'..='Z' | 'a'..='z' | '0'..='9' | '_']* }
            / expected!("identifier")

        rule number() -> i32
            = value:$(NUMBER()) ignored()?
            { value.parse().unwrap() }
        rule id() -> String
            = id:$(ID()) ignored()?
            { id.to_owned() }

        rule NOT() = "!" ignored()?
        rule EQUAL() = "==" ignored()?
        rule NOT_EQUAL() = "!=" ignored()?
        rule PLUS() = "+" ignored()?
        rule MINUS() = "-" ignored()?
        rule STAR() = "*" ignored()?
        rule SLASH() = "/" ignored()?
        rule ASSIGN() = "=" ignored()?

        rule expression() -> Ast = precedence!{
            left:(@) EQUAL()     right:@ { Ast::Eq(Box::new(left), Box::new(right)) }
            left:(@) NOT_EQUAL() right:@ { Ast::Ne(Box::new(left), Box::new(right)) }
            --
            left:(@) PLUS()      right:@ { Ast::Add(Box::new(left), Box::new(right)) }
            left:(@) MINUS()     right:@ { Ast::Sub(Box::new(left), Box::new(right)) }
            --
            left:(@) STAR()      right:@ { Ast::Mul(Box::new(left), Box::new(right)) }
            left:(@) SLASH()     right:@ { Ast::Div(Box::new(left), Box::new(right)) }
            --
                     NOT()       term:@ { Ast::Not(Box::new(term)) }
            --
            name:id() LEFT_PAREN() args:(expression() ** COMMA()) RIGHT_PAREN()
                { Ast::Call(name, args) }
            value:number() { Ast::Number(value) }
            name:id() { Ast::Id(name) }
            LEFT_PAREN() term:expression() RIGHT_PAREN() { term }
        }

        rule assert_statement() -> Ast
            = ASSERT() LEFT_PAREN() term:expression() RIGHT_PAREN() SEMICOLON()
            { Ast::Assert(Box::new(term)) }

        rule return_statement() -> Ast
            = RETURN() term:expression() SEMICOLON()
            { Ast::Return(Box::new(term)) }

        rule if_statement() -> Ast
            = IF() LEFT_PAREN() condition:expression() RIGHT_PAREN()
                consequence:statement() ELSE() alternative:statement()
            { Ast::If(Box::new(condition), Box::new(consequence), Box::new(alternative)) }

        rule while_statement() -> Ast
            = WHILE() LEFT_PAREN() condition:expression() RIGHT_PAREN() statement:statement()
            { Ast::While(Box::new(condition), Box::new(statement)) }

        rule var_statement() -> Ast
            = VAR() name:id() ASSIGN() term:expression() SEMICOLON()
            { Ast::Var(name, Box::new(term)) }

        rule assignment_statement() -> Ast
            = name:id() ASSIGN() term:expression() SEMICOLON()
            { Ast::Assign(name, Box::new(term)) }

        rule block_statement() -> Ast
            = LEFT_BRACE() statements:(statement()*) RIGHT_BRACE()
            { Ast::Block(statements) }

        rule function_statement() -> Ast
            = FUNCTION() name:id()
                LEFT_PAREN() params:(id() ** COMMA()) RIGHT_PAREN()
                statement:block_statement()
            { Ast::Function(name, params, Box::new(statement)) }

        rule expression_statement() -> Ast
            = term:expression() SEMICOLON()
            { term }

        rule statement() -> Ast
            = assert_statement()
            / return_statement()
            / if_statement()
            / while_statement()
            / var_statement()
            / block_statement()
            / function_statement()
            / assignment_statement()
            / expression_statement()

        pub rule program() -> Ast
            = ignored()? statements:(statement()*)
            { Ast::Block(statements) }
    }
}

#[derive(Debug)]
pub enum EmitError {
    TooManyArguments,
    UndefinedVariable(String),
    Io(io::Error),
}

impl fmt::Display for EmitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            EmitError::TooManyArguments => write!(f, "more than 4 arguments are not supported"),
            EmitError::UndefinedVariable(name) => write!(f, "undefined variable `{}`", name),
            EmitError::Io(error) => write!(f, "{}", error),
        }
    }
}

impl std::error::Error for EmitError {
    fn cause(&self) -> Option<&dyn std::error::Error> {
        match self {
            EmitError::TooManyArguments | EmitError::UndefinedVariable(_) => None,
            EmitError::Io(error) => Some(error),
        }
    }
}

impl From<io::Error> for EmitError {
    fn from(src: io::Error) -> EmitError {
        EmitError::Io(src)
    }
}

#[derive(Debug, Copy, Clone)]
struct Label(u32);

impl fmt::Display for Label {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, ".L{}", self.0)
    }
}

pub struct Environment {
    next_local_offset: i32,
    local_offsets: HashMap<String, i32>,
}

impl Environment {
    pub fn new() -> Environment {
        Environment {
            next_local_offset: 0,
            local_offsets: HashMap::new(),
        }
    }
}

pub struct Emitter<'writer> {
    writer: &'writer mut dyn Write,
    next_label_id: u32,
}

impl<'writer> Emitter<'writer> {
    pub fn new(writer: &'writer mut dyn Write) -> Emitter<'writer> {
        Emitter {
            writer,
            next_label_id: 0,
        }
    }

    fn create_label(&mut self) -> Label {
        let label = Label(self.next_label_id);
        self.next_label_id += 1;
        label
    }

    pub fn emit(&mut self, env: &mut Environment, ast: &Ast) -> Result<(), EmitError> {
        match ast {
            Ast::Main(statements) => {
                writeln!(self.writer, ".global main")?;
                writeln!(self.writer, "main:")?;
                writeln!(self.writer, "  push {{fp, lr}}")?;
                for statement in statements {
                    self.emit(env, statement)?;
                }
                writeln!(self.writer, "  mov r0, #0")?;
                writeln!(self.writer, "  pop {{fp, pc}}")?;
            }
            Ast::Assert(condition) => {
                self.emit(env, condition)?;
                writeln!(self.writer, "  cmp r0, #1")?;
                writeln!(self.writer, "  moveq r0, #'.'")?;
                writeln!(self.writer, "  movne r0, #'F'")?;
                writeln!(self.writer, "  bl putchar")?;
            }
            Ast::Number(value) => {
                writeln!(self.writer, "  ldr r0, ={}", value)?;
            }
            Ast::Not(term) => {
                self.emit(env, term)?;
                writeln!(self.writer, "  cmp r0, #0")?;
                writeln!(self.writer, "  moveq r0, #1")?;
                writeln!(self.writer, "  movne r0, #0")?;
            }
            Ast::Eq(left, right) => {
                self.emit(env, left)?;
                writeln!(self.writer, "  push {{r0, ip}}")?;
                self.emit(env, right)?;
                writeln!(self.writer, "  pop {{r1, ip}}")?;
                writeln!(self.writer, "  cmp r0, r1")?;
                writeln!(self.writer, "  moveq r0, #1")?;
                writeln!(self.writer, "  movne r0, #0")?;
            }
            Ast::Ne(left, right) => {
                self.emit(env, left)?;
                writeln!(self.writer, "  push {{r0, ip}}")?;
                self.emit(env, right)?;
                writeln!(self.writer, "  pop {{r1, ip}}")?;
                writeln!(self.writer, "  cmp r0, r1")?;
                writeln!(self.writer, "  movne r0, #1")?;
                writeln!(self.writer, "  moveq r0, #0")?;
            }
            Ast::Add(left, right) => {
                self.emit(env, left)?;
                writeln!(self.writer, "  push {{r0, ip}}")?;
                self.emit(env, right)?;
                writeln!(self.writer, "  pop {{r1, ip}}")?;
                writeln!(self.writer, "  add r0, r1, r0")?;
            }
            Ast::Sub(left, right) => {
                self.emit(env, left)?;
                writeln!(self.writer, "  push {{r0, ip}}")?;
                self.emit(env, right)?;
                writeln!(self.writer, "  pop {{r1, ip}}")?;
                writeln!(self.writer, "  sub r0, r1, r0")?;
            }
            Ast::Mul(left, right) => {
                self.emit(env, left)?;
                writeln!(self.writer, "  push {{r0, ip}}")?;
                self.emit(env, right)?;
                writeln!(self.writer, "  pop {{r1, ip}}")?;
                writeln!(self.writer, "  mul r0, r1, r0")?;
            }
            Ast::Div(left, right) => {
                self.emit(env, left)?;
                writeln!(self.writer, "  push {{r0, ip}}")?;
                self.emit(env, right)?;
                writeln!(self.writer, "  pop {{r1, ip}}")?;
                writeln!(self.writer, "  udiv r0, r1, r0")?;
            }
            Ast::Call(callee, args) => match args.as_slice() {
                [] => {
                    writeln!(self.writer, "  bl {}", callee)?;
                }
                [arg] => {
                    self.emit(env, arg)?;
                    writeln!(self.writer, "  bl {}", callee)?;
                }
                args if args.len() <= 4 => {
                    writeln!(self.writer, "  sub sp, sp, #16")?;
                    for (i, arg) in args.iter().enumerate() {
                        self.emit(env, arg)?;
                        writeln!(self.writer, "  str r0, [sp, #{}]", 4 * i)?;
                    }
                    writeln!(self.writer, "  pop {{r0, r1, r2, r3}}")?;
                    writeln!(self.writer, "  bl {}", callee)?;
                }
                _ => {
                    return Err(EmitError::TooManyArguments);
                }
            },
            Ast::Exit(term) => {
                const SYSCALL_NUMBER: u32 = 1;
                writeln!(self.writer, "  mov r0, #0")?;
                writeln!(self.writer, "  bl fflush")?;
                self.emit(env, term)?;
                writeln!(self.writer, "  mov r7, #{}", SYSCALL_NUMBER)?;
                writeln!(self.writer, "  swi #0")?;
            }
            Ast::Block(statements) => {
                for statement in statements {
                    self.emit(env, statement)?;
                }
            }
            Ast::If(condition, consequence, alternative) => {
                let consequence_label = self.create_label();
                let alternative_label = self.create_label();

                self.emit(env, condition)?;
                writeln!(self.writer, "  cmp r0, #0")?;
                writeln!(self.writer, "  beq {}", consequence_label)?;
                self.emit(env, consequence)?;
                writeln!(self.writer, "  b {}", alternative_label)?;
                writeln!(self.writer, "{}:", consequence_label)?;
                self.emit(env, alternative)?;
                writeln!(self.writer, "{}:", alternative_label)?;
            }
            Ast::Function(name, params, body) => {
                writeln!(self.writer, "")?;
                writeln!(self.writer, ".global {}", name)?;
                writeln!(self.writer, "{}:", name)?;
                // Prologue
                writeln!(self.writer, "  push {{fp, lr}}")?;
                writeln!(self.writer, "  mov fp, sp")?;
                writeln!(self.writer, "  push {{r0, r1, r2, r3}}")?;
                // Set up environment
                let mut env = Environment::new();
                for (i, param) in params.iter().enumerate() {
                    env.local_offsets.insert(param.clone(), 4 * (i as i32) - 16);
                }
                env.next_local_offset = -20;
                self.emit(&mut env, body)?;
                // Epilogue
                writeln!(self.writer, "  mov sp, fp")?;
                writeln!(self.writer, "  mov r0, #0")?;
                writeln!(self.writer, "  pop {{fp, pc}}")?;
            }
            Ast::Id(name) => match env.local_offsets.get(name) {
                Some(offset) => writeln!(self.writer, "  ldr r0, [fp, #{}]", offset)?,
                None => return Err(EmitError::UndefinedVariable(name.clone())),
            },
            Ast::Return(term) => {
                self.emit(env, term)?;
                writeln!(self.writer, "  mov sp, fp")?;
                writeln!(self.writer, "  pop {{fp, pc}}")?;
            }
            Ast::While(condition, body) => {
                let loop_start = self.create_label();
                let loop_end = self.create_label();
                writeln!(self.writer, "{}:", loop_start)?;
                self.emit(env, condition)?;
                writeln!(self.writer, "  cmp r0, #0")?;
                writeln!(self.writer, "  beq {}", loop_end)?;
                self.emit(env, body)?;
                writeln!(self.writer, "  b {}", loop_start)?;
                writeln!(self.writer, "{}:", loop_end)?;
            }
            Ast::Assign(name, value) => {
                self.emit(env, value)?;
                match env.local_offsets.get(name) {
                    Some(offset) => writeln!(self.writer, "  str r0, [fp, #{}]", offset)?,
                    None => return Err(EmitError::UndefinedVariable(name.clone())),
                }
            }
            Ast::Var(name, value) => {
                self.emit(env, value)?;
                writeln!(self.writer, "  push {{r0, ip}}")?;
                env.local_offsets
                    .insert(name.clone(), env.next_local_offset - 4);
                env.next_local_offset -= 8;
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_end_to_end() {
        const SOURCE: &str = include_str!("../../sample.program");

        let source_ast = ast_parser::program(SOURCE).unwrap();
        let mut target = Vec::new();

        Emitter::new(&mut target)
            .emit(&mut Environment::new(), &source_ast)
            .unwrap();
    }
}

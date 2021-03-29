let emitf f = Printf.ksprintf print_endline f
let sprintf = Printf.sprintf


module Regexp = struct
  (* Wrapper to hide the awkwardness of Str API. *)
  type t = Str.regexp

  let create = Str.regexp

  let match' regexp ~string ~index =
    if Str.string_match regexp string index then
      Some (Str.matched_string string)
    else
      None
end

let re = Regexp.create


module Source = struct
  type t = {string: string; index: int}

  module ParseResult = struct
    type nonrec 'a t = {value: 'a; source: t}
  end

  let match' {string; index} regexp =
    match Regexp.match' regexp ~string ~index with
    | None -> None
    | Some value ->
        let source = {string; index=index + String.length value} in
        Some ParseResult.{value; source}
end

module ParseResult = Source.ParseResult


let test_source_matching_is_idempotent =
  let (let*) = Option.bind in
  let s = Source.{string="  let"; index=2} in
  let* result1 = Source.match' s (re "let") in
  assert (result1.value = "let");
  assert (result1.source.index == 5);
  let* result2 = Source.match' s (re "let") in
  assert (result1.value = "let");
  assert (result1.source.index == 5);
  None


module Parser = struct
  type 'a t = Source.t -> 'a ParseResult.t option

  let regexp regexp = 
    fun source -> Source.match' source regexp

  let constant value =
    fun source -> Some ParseResult.{value; source}

  let error message =
    fun source -> failwith message

  (* The (or) operator is kinda deprecated in OCaml, but 
     it fits so well here that I couldn't resist using it. *)
  let (or) left_parser right_parser =
    fun source ->
      match left_parser source with
      | Some result -> Some result
      | None -> right_parser source

  let zero_or_more parser =
    let rec go results source =
      match parser source with
      | None -> results, source
      | Some ParseResult.{value; source} ->
          go (value :: results) source in
    fun source ->
      let results, source = go [] source in
      Some ParseResult.{value=List.rev results; source}

  let bind parser callback =
    fun source ->
      match parser source with
      | None -> None
      | Some ParseResult.{value; source} ->
          callback value source

  (* This is a recent feature of OCaml: let operators.
   * `let* x = y in z` is the same as `y |> Parser.bind (fun x -> z)` *)
  let (let*) = bind

  (* Non-primitive, composite combinators *)
  let and' left_parser right_parser =
    bind left_parser (fun _ -> right_parser)

  let map callback parser =
    bind parser (fun value -> constant (callback value))

  let maybe parser =
    (parser |> map Option.some) or constant None

  let parse_string_to_completion parser string =
    let source = Source.{string; index=0} in
    match parser source with
    | None -> 
        failwith "Parse error: could not parse anything at all"
    | Some ParseResult.{value; source=Source.{string; index}} ->
        if index <> String.length string then
          failwith ("Parse error at index " ^ Int.to_string index)
        else
          value
end

module Label = struct
  let counter = ref 0

  let create () = 
    let label = sprintf ".L%i" !counter in
    incr counter;
    label
end

module Environment = struct
  type t = {
    locals: (string, int) Hashtbl.t; 
    mutable next_local_offset: int;
  }

  let create () =
    let locals = Hashtbl.create 64 in
    {locals; next_local_offset=0}

  let get {locals; _} = Hashtbl.find_opt locals
  let set {locals; _} = Hashtbl.replace locals
end

module AST = struct
  type t =
    | Main of t list
    | Assert of t
    | Number of int
    | Not of t
    | Equal of t * t
    | NotEqual of t * t
    | Add of t * t
    | Subtract of t * t
    | Multiply of t * t
    | Divide of t * t
    | Call of {callee: string; args: t list}
    | Exit of t
    | Block of t list
    | If of {conditional: t; consequence: t; alternative: t}
    | Function of {name: string; parameters: string list; body: t}
    | Id of string
    | Return of t
    | While of {conditional: t; body: t}
    | Assign of {name: string; value: t}
    | Var of {name: string; value: t}

  let rec emit env = function
    | Main statements ->
        emitf ".global main";
        emitf "main:";
        emitf "  push {fp, lr}";
        List.iter (emit env) statements;
        emitf "  mov r0, #0";
        emitf "  pop {fp, pc}"
    | Assert condition ->
        emit env condition;
        emitf "  cmp r0, #1";
        emitf "  moveq r0, #'.'";
        emitf "  movne r0, #'F'";
        emitf "  bl putchar"
    | Number value ->
        emitf "  ldr r0, =%i" value
    | Not term ->
        emit env term;
        emitf "  cmp r0, #0";
        emitf "  moveq r0, #1";
        emitf "  movne r0, #0"
    | Equal (left, right) ->
        emit env left;
        emitf "  push {r0, ip}";
        emit env right;
        emitf "  pop {r1, ip}";
        emitf "  cmp r0, r1";
        emitf "  moveq r0, #1";
        emitf "  movne r0, #0"
    | NotEqual (left, right) ->
        emit env left;
        emitf "  push {r0, ip}";
        emit env right;
        emitf "  pop {r1, ip}";
        emitf "  cmp r0, r1";
        emitf "  movne r0, #1";
        emitf "  moveq r0, #0"
    | Add (left, right) ->
        emit env left;
        emitf "  push {r0, ip}";
        emit env right;
        emitf "  pop {r1, ip}";
        emitf "  add r0, r1, r0"
    | Subtract (left, right) ->
        emit env left;
        emitf "  push {r0, ip}";
        emit env right;
        emitf "  pop {r1, ip}";
        emitf "  sub r0, r1, r0"
    | Multiply (left, right) ->
        emit env left;
        emitf "  push {r0, ip}";
        emit env right;
        emitf "  pop {r1, ip}";
        emitf "  mul r0, r1, r0"
    | Divide (left, right) ->
        emit env left;
        emitf "  push {r0, ip}";
        emit env right;
        emitf "  pop {r1, ip}";
        emitf "  udiv r0, r1, r0"
    | Call {callee; args=[]} ->
        emitf "  bl %s" callee
    | Call {callee; args=[term]} ->
        emit env term;
        emitf "  bl %s" callee
    | Call {callee; args} when List.length args <= 4 ->
        emitf "  sub sp, sp, #16";
        args |> List.iteri (fun i arg ->
          emit env arg;
          emitf "  str r0, [sp, #%i]" (4 * i)
        );
        emitf "  pop {r0, r1, r2, r3}";
        emitf "  bl %s" callee
    | Call _ ->
        raise (Failure "More than 4 arguments are not supported")
    | Exit term ->
        let syscall_number = 1 in
        emitf "  mov r0, #0";
        emitf "  bl fflush";
        emit env term;
        emitf "  mov r7, #%i" syscall_number;
        emitf "  swi #0"
    | Block statements ->
        List.iter (emit env) statements
    | If {conditional; consequence; alternative} ->
        let if_false_label = Label.create ()
        and end_if_label = Label.create () in
        emit env conditional;
        emitf "  cmp r0, #0";
        emitf "  beq %s" if_false_label;
        emit env consequence;
        emitf "  b %s" end_if_label;
        emitf "%s:" if_false_label;
        emit env alternative;
        emitf "%s:" end_if_label
    | Function {name; parameters; body} ->
        emitf "";
        emitf ".global %s" name;
        emitf "%s:" name;
        (* Prologue *)
        emitf "  push {fp, lr}";
        emitf "  mov fp, sp";
        emitf "  push {r0, r1, r2, r3}";
        (* Set up environment *)
        let env = Environment.create () in
        parameters |> List.iteri (fun i parameter ->
          Environment.set env parameter (4 * i - 16)
        );
        env.next_local_offset <- -20;
        emit env body;
        (* Epilogue *)
        emitf "  mov sp, fp";
        emitf "  mov r0, #0";
        emitf "  pop {fp, pc}"
    | Id value ->
        begin match Environment.get env value with
        | Some offset ->
            emitf "  ldr r0, [fp, #%i]" offset
        | None ->
            raise (Failure ("Undefined variable " ^ value))
        end
    | Return term ->
        emit env term;
        emitf "  mov sp, fp";
        emitf "  pop {fp, pc}"
    | While {conditional; body} ->
        let loop_start = Label.create ()
        and loop_end = Label.create () in
        emitf "%s:" loop_start;
        emit env conditional;
        emitf "  cmp r0, #0";
        emitf "  beq %s" loop_end;
        emit env body;
        emitf "  b %s" loop_start;
        emitf "%s:" loop_end
    | Assign {name; value} ->
        emit env value;
        begin match Environment.get env name with
        | Some offset ->
            emitf "  str r0, [fp, #%i]" offset
        | None ->
            raise (Failure ("Undefined variable " ^ name))
        end
    | Var {name; value} ->
        emit env value;
        emitf "  push {r0, ip}";
        Environment.set env name (env.next_local_offset - 4);
        env.next_local_offset <- env.next_local_offset - 8



end

open Parser
open AST


let test_parsing_alternatives_with_or =
  let parser = regexp (re "bye") or regexp (re "hai") in
  let result = Parser.parse_string_to_completion parser "hai" in
  assert (result = "hai")

let test_parsing_with_bindings =
  let parser = 
    let* word = regexp (re "[a-z]+") in
    let* digits = regexp (re "[0-9]+") in
    constant (sprintf "first %s, then %s" word digits)
  in
  let result = Parser.parse_string_to_completion parser "hai123" in
  assert (result = "first hai, then 123")

let whitespace = regexp (re "[ \n\r\t]+")
let comments = (* TODO check dot-all *)
  regexp (re "[/][/].*") or regexp (re "[/][*].*[*][/]")
let ignored = zero_or_more (whitespace or comments)

let token pattern =
  let* value = regexp pattern in
  let* _ = ignored in
  constant value

(* Keywords *)
let _FUNCTION = token (re {|function\b|})
let _IF = token (re {|if\b|})
let _WHILE = token (re {|while\b|})
let _ELSE = token (re {|else\b|})
let _RETURN = token (re {|return\b|})
let _VAR = token (re {|var\b|})

let _COMMA = token (re {|[,]|})
let _SEMICOLON = token (re {|[;]|})
let _LEFT_PAREN = token (re {|[(]|})
let _RIGHT_PAREN = token (re {|[)]|})
let _LEFT_BRACE = token (re {|[{]|})
let _RIGHT_BRACE = token (re {|[}]|})

let _NUMBER =
  token (re "[0-9]+") |> map (fun digits ->
    Number (int_of_string digits))

let _ID =
  token (re "[a-zA-Z_][a-zA-Z0-9_]*")

let id = _ID |> map (fun x -> Id x)

(* Operators *)
let _NOT = token (re "!") |> map (fun _ x -> Not x)
let _EQUAL = token (re "==") |> map (fun _ x y -> Equal (x, y))
let _NOT_EQUAL = token (re "!=") |> map (fun _ x y -> NotEqual (x, y))
let _PLUS = token (re "[+]") |> map (fun _ x y -> Add (x, y))
let _MINUS = token (re "[-]") |> map (fun _ x y -> Subtract (x, y))
let _STAR = token (re "[*]") |> map (fun _ x y -> Multiply (x, y))
let _SLASH = token (re "[/]") |> map (fun _ x y -> Divide (x, y))
let _ASSIGN = 
  token (re "=") |> map (fun _ name value -> Assign {name; value})

(* `let rec` allows us to define `expression` recursively without
   mutation. However, it needs to be a function (eta-expanded) and
   applied in the very end. *)
let rec expression source =
  (* args <- (expression (COMMA expression)* )? *)
  let args = 
    begin 
      let* arg = expression in
      let* args = zero_or_more (and' _COMMA expression) in
      constant (arg :: args)
    end or constant []
  in
  (* call <- ID LEFT_PAREN args RIGHT_PAREN *)
  let call =
    let* callee = _ID in
    let* _ = _LEFT_PAREN in
    let* args = args in
    let* _ = _RIGHT_PAREN in
    constant (Call {callee; args})
  in
  (* atom <- call / ID / NUMBER / LEFT_PAREN expression RIGHT_PAREN *)
  let atom =
    call or id or _NUMBER or begin
      let* _ = _LEFT_PAREN in
      let* e = expression in
      let* _ = _RIGHT_PAREN in
      constant e
    end
  in
  (* unary <- NOT? atom *)
  let unary =
    let* not = maybe _NOT in
    let* term = atom in
    match not with
    | None -> constant term
    | Some _ -> constant (Not term)
  in
  let infix operator_parser term_parser =
    let* term = term_parser in
    let operator_term =
      let* operator = operator_parser in
      let* term = term_parser in
      constant (operator, term)
    in
    let* operator_terms = zero_or_more operator_term in
    constant begin
      operator_terms |> List.fold_left (fun left (operator, term) ->
        operator left term) term
    end
  in
  (* product <- unary ((STAR / SLASH) unary)* *)
  let product = infix (_STAR or _SLASH) unary in
  (* sum <- product ((PLUS / MINUS) product)* *)
  let sum = infix (_PLUS or _MINUS) product in
  (* comparison <- sum ((EQUAL / NOT_EQUAL) sum)* *)
  let comparison = infix (_EQUAL or _NOT_EQUAL) sum in
  (* expression <- comparison *)
  let expression = comparison in
  expression source


let rec statement source =
  (* return_statement <- RETURN expression SEMICOLON *)
  let return_statement =
    let* _ = _RETURN in
    let* term = expression in
    let* _ = _SEMICOLON in
    constant (Return term)
  in
  (* expression_statement <- expression SEMICOLON *)
  let expression_statement =
    let* term = expression in
    let* _ = _SEMICOLON in
    constant term
  in
  (* if_statement <-
       IF LEFT_PAREN expression RIGHT_PAREN 
         statement 
       ELSE 
         statement *)
  let if_statement =
    let* _ = _IF in
    let* _ = _LEFT_PAREN in
    let* conditional = expression in
    let* _ = _RIGHT_PAREN in
    let* consequence = statement in
    let* _ = _ELSE in
    let* alternative = statement in
    constant (If {conditional; consequence; alternative})
  in
  (* while_statement <-
       WHILE LEFT_PAREN expression RIGHT_PAREN
         statement *)
  let while_statement =
    let* _ = _WHILE in
    let* _ = _LEFT_PAREN in
    let* conditional = expression in
    let* _ = _RIGHT_PAREN in
    let* body = statement in
    constant (While {conditional; body})
  in
  (* var_statement <- VAR ID ASSIGN expression SEMICOLON *)
  let var_statement =
    let* _ = _VAR in
    let* name = _ID in
    let* _ = _ASSIGN in
    let* value = expression in
    let* _ = _SEMICOLON in
    constant (Var {name; value})
  in
  (* assignment_statement <- ID ASSIGN expression SEMICOLON *)
  let assignment_statement =
    let* name = _ID in
    let* _ = _ASSIGN in
    let* value = expression in
    let* _ = _SEMICOLON in
    constant (Assign {name; value})
  in
  (* block_statement <- LEFT_BRACE statement* RIGHT_BRACE *)
  let block_statement =
    let* _ = _LEFT_BRACE in
    let* statements = zero_or_more statement in
    let* _ = _RIGHT_BRACE in
    constant (Block statements)
  in
  (* parameters <- (ID (COMMA ID)* )? *)
  let parameters = 
    begin
      let* param = _ID in
      let* params = zero_or_more (and' _COMMA _ID) in
      constant (param :: params)
    end or constant []
  in
  (* function_statement <-
       FUNCTION ID LEFT_PAREN parameters RIGHT_PAREN 
         block_statement *)
  let function_statement =
    let* _ = _FUNCTION in
    let* name = _ID in
    let* _ = _LEFT_PAREN in
    let* parameters = parameters in
    let* _ = _RIGHT_PAREN in
    let* body = block_statement in
    constant (Function {name; parameters; body})
  in
  (* statement <- return_statement
                / if_statement
                / while_statement
                / var_statement
                / assignment_statement
                / block_statement
                / function_statement
                / expression_statement
   *)
  let statement = 
    return_statement
      or function_statement
      or if_statement 
      or while_statement
      or var_statement
      or assignment_statement
      or block_statement
      or expression_statement
  in
  statement source
    
let parser =
  let* _ = ignored in
  let* statements = zero_or_more statement in
  constant (Block statements)
     

let test_expression_parser = 
  let x, y, z = Id "x", Id "y", Id "z" in
  let parse = parse_string_to_completion expression in
  assert (parse "x + y + z" = Add (Add (x, y), z));
  assert (parse "x + y * z" = Add (x, Multiply (y, z)));
  assert (parse "x * y + z" = Add (Multiply (x, y), z));
  assert (parse "(x + y) * z" = Multiply (Add (x, y), z));
  assert (parse "x == y + z" = Equal (x, Add (y, z)));
  assert (parse "x + y == z" = Equal (Add (x, y), z));
  assert (parse "f()" = Call {callee="f"; args=[]});
  assert (parse "f(x)" = Call {callee="f"; args=[x]});
  assert (parse "f(x, y)" = Call {callee="f"; args=[x; y]});
  assert (parse "f(x, y, z)" = Call {callee="f"; args=[x; y; z]})


let test_statement_parser =  
  let x, y, z = Id "x", Id "y", Id "z" in
  let parse = parse_string_to_completion statement in
  assert (parse "return x;" = Return x);
  assert (parse "returnx;" = Id "returnx");
  assert (parse "x + y;" = Add (x, y));

  assert (parse "if (x) return y; else return z;" =
    If {conditional=x; consequence=Return y; alternative=Return z});

  assert (parse "{}" = Block []);
  assert (parse "{ x; y; }" = Block [x; y]);

  assert (parse "if (x) { return y; } else { return z; }" =
    If {conditional=x; 
        consequence=Block [Return y]; 
        alternative=Block [Return z]});

  assert (parse "function id(x) { return x; }" =
    Function {name="id"; parameters=["x"]; body=Block [Return x]})

let test_parser_integration = 
  let source = {|
    function factorial(n) {
      var result = 1;
      while (n != 1) {
        result = result * n;
        n = n - 1;
      }
      return result;
    }
  |} in 
  let expected = Block [
    Function {name="factorial"; parameters=["n"]; body=Block [
      Var {name="result"; value=Number 1};
      While {conditional=NotEqual (Id "n", Number 1); body=Block [
        Assign {name="result"; value=Multiply (Id "result", Id "n")};
        Assign {name="n"; value=Subtract (Id "n", Number 1)};
      ]};
      Return (Id "result");
    ]};
  ] in
  let result = parse_string_to_completion parser source in
  assert (result = expected)

let test_end_to_end =
  let source = {|
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

  |} in
  let ast = parse_string_to_completion parser source in
  let env = Environment.create () in
  emit env ast

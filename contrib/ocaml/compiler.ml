let printf = Format.printf
let fprintf = Format.fprintf
let asprintf = Format.asprintf
let pp_list = Format.pp_print_list
let pp_comma ppf () = fprintf ppf ", "

let gensym =
  let open Printf in
  let id = ref 0 in
  fun () -> incr id; sprintf ".L%i" !id

let fold ~nil ~cons list = List.fold_right cons list nil

type 'value environment =
  | Empty
  | Entry of string * 'value * 'value environment

let rec lookup lookup_key = function
  | Empty -> failwith lookup_key
  | Entry (key, value, next) ->
      if key = lookup_key then value else lookup lookup_key next

module ARM = struct
  module Register = struct
    type t = [
      | `r0 | `r1 | `r2 | `r3 | `r4
      | `r7
      | `fp | `ip | `sp | `lr | `pc
    ]

    let pp ppf = function
      | `r0 -> fprintf ppf "r0"
      | `r1 -> fprintf ppf "r1"
      | `r2 -> fprintf ppf "r2"
      | `r3 -> fprintf ppf "r3"
      | `r4 -> fprintf ppf "r4"

      | `r7 -> fprintf ppf "r7"

      | `fp -> fprintf ppf "fp"
      | `ip -> fprintf ppf "ip"
      | `sp -> fprintf ppf "sp"
      | `lr -> fprintf ppf "lr"
      | `pc -> fprintf ppf "pc"
  end

  module Immediate = struct
    type t = [`i of int]

    let pp ppf = function
      | `i i -> fprintf ppf "#%i" i
  end

  module Operand = struct
    type t = [Register.t | Immediate.t]

    let pp ppf = function
      | #Register.t as x -> Register.pp ppf x
      | #Immediate.t as x -> Immediate.pp ppf x
  end

  module Condition = struct
    type t = EQ | NE | GT | LT | LE | HS | LO | MI | PL | AL

    let pp ppf = function
      | EQ -> fprintf ppf "eq"
      | NE -> fprintf ppf "ne"
      | GT -> fprintf ppf "gt"
      | LT -> fprintf ppf "lt"
      | LE -> fprintf ppf "le"
      | HS -> fprintf ppf "hs"
      | LO -> fprintf ppf "lo"
      | MI -> fprintf ppf "mi"
      | PL -> fprintf ppf "pl"
      | AL -> fprintf ppf "" (* Default *)
  end

  module Instruction = struct
    type t =
      | Label of string
      | Directive of string * string
      | MOV of Condition.t * Register.t * [Register.t | Immediate.t]
      | LDR of Register.t * Register.t * int
      | LDR_eq of Register.t * int (* pseudo instruction *)
      | ADD of Register.t * Register.t * Operand.t
      | SUB of Register.t * Register.t * Operand.t
      | MUL of Register.t * Register.t * Register.t
      | CMP of Register.t * [Register.t | Immediate.t]
      | PUSH of Register.t list
      | POP of Register.t list
      | STR of Register.t * Register.t * Operand.t
      | SWI of int
      | BX of Register.t
      | BL of string
      | B of Condition.t * string


    let pp ppf = function
      | Label l -> fprintf ppf "%s:" l
      | Directive (a, b) -> fprintf ppf ".%s %s" a b
      | MOV (c, x, y) ->
          fprintf ppf "  mov%a %a, %a" Condition.pp c Operand.pp x Operand.pp y
      | LDR (x, y, i) ->
          fprintf ppf "  ldr %a, [%a, #%i]" Operand.pp x Operand.pp y i
      | LDR_eq (x, i) ->
          fprintf ppf "  ldr %a, =%i" Operand.pp x i
      | ADD (a, b, c) ->
          fprintf ppf "  add %a, %a, %a" Operand.pp a Operand.pp b Operand.pp c
      | SUB (a, b, c) ->
          fprintf ppf "  sub %a, %a, %a" Operand.pp a Operand.pp b Operand.pp c
      | MUL (a, b, c) ->
          fprintf ppf "  mul %a, %a, %a" Operand.pp a Operand.pp b Operand.pp c
      | CMP (x, y) ->
          fprintf ppf "  cmp %a, %a" Operand.pp x Operand.pp y
      | PUSH xs ->
          fprintf ppf "  push {%a}" (pp_list ~pp_sep:pp_comma Register.pp) xs
      | POP xs ->
          fprintf ppf "  pop {%a}" (pp_list ~pp_sep:pp_comma Register.pp) xs
      | STR (a, b, c) ->
          fprintf ppf "  str %a, [%a, %a]" Operand.pp a Operand.pp b Operand.pp c
      | SWI i -> fprintf ppf "  swi #%i" i
      | BX r -> fprintf ppf "  bx %a" Register.pp r
      | BL l -> fprintf ppf "  bl %s" l
      | B (c, l) -> fprintf ppf "  b%a %s" Condition.pp c l
  end

  type t =
    | One of Instruction.t
    | Many of t list

  type condition = Condition.t = EQ | NE | GT | LT | LE | HS | LO | MI | PL | AL

  let label s = One (Label s)
  let directive a b = One (Directive (a, b))
  let mov ?(condition=AL) x y = One (MOV (condition, x, y))
  let ldr x (y, o) = One (LDR (x, y, o))
  let ldr_eq x i  = One (LDR_eq (x, i))
  let add a b c = One (ADD (a, b, c))
  let sub a b c = One (SUB (a, b, c))
  let sub_i a b c = One (SUB (a, b, `i c))
  let mul a b c = One (MUL (a, b, c))
  let cmp x y = One (CMP (x, y))
  let push xs = One (PUSH xs)
  let pop xs = One (POP xs)
  let str a (b, c) = One (STR (a, b, c))
  let str_i a (b, c) = One (STR (a, b, `i c))
  let swi i = One (SWI i)
  let bx r = One (BX r)
  let bl l = One (BL l)
  let b ?(condition=AL) l = One (B (condition, l))

  (* Shortcuts *)
  let global a = One (Directive ("global", a))
  let mov_i ?condition x y = mov x (`i y) ?condition
  let cmp_i x y = One (CMP (x, (`i y)))
  let add_i a b i = One (ADD (a, b, `i i))

  let asm xs = Many xs

  let rec pp ppf = function
    | One x -> fprintf ppf "%a\n" Instruction.pp x
    | Many xs -> fprintf ppf "%a" (pp_list pp) xs
end

let asm = ARM.asm

module AST = struct
  type unary_primitive = Times_two | Is_zero

  type term =
    | Immediate of int
    | Not of term
    | Equal of term * term
    | Add of term * term
    | Subtract of term * term
    | Multiply of term * term
    | Unary_primitive_call of unary_primitive * term
    | Call of {name: string; arguments: term list}
    | Id of string

  type statement =
    | Assert of term
    | Exit of term
    | Block of statement list
    | Expression of term
    | Return of term option
    | If of {
        conditional: term;
        consequence: statement;
        alternative: statement;
      }
    | Function of {
        name: string;
        parameters: string list;
        statements: statement list;
      }

  type t = statement list
end


module Emit_assembly = struct
  open AST

  let rec emit_binary_primitive ~env first second body = asm ARM.[
    push [`r1; `ip];
    emit_term ~env second;
    mov `r1 `r0;
    emit_term ~env first;
    body;
    pop [`r1; `ip];
  ]

  and emit_term ~env = function
    | Immediate x -> ARM.ldr_eq `r0 x
    | Unary_primitive_call (Is_zero, operand) ->
        asm ARM.[
          emit_term ~env operand;
          cmp_i `r0 0;
          mov_i `r0 1 ~condition:EQ;
          mov_i `r0 0 ~condition:NE;
        ]
    | Not operand ->
        asm ARM.[
          emit_term ~env operand;
          cmp_i `r0 0;
          mov_i `r0 1 ~condition:EQ;
          mov_i `r0 0 ~condition:NE;
        ]
    | Equal (left, right) ->
        asm ARM.[
          emit_term ~env left;
          push [`r0; `ip];
          emit_term ~env right;
          pop [`r1; `ip];
          cmp `r0 `r1;
          mov_i `r0 1 ~condition:EQ;
          mov_i `r0 0 ~condition:NE;
        ]
    | Add (left, right) ->
        emit_binary_primitive ~env left right ARM.(add `r0 `r0 `r1)
    | Subtract (left, right) ->
        emit_binary_primitive ~env left right ARM.(sub `r0 `r0 `r1)
    | Multiply (left, right) ->
        emit_binary_primitive ~env left right ARM.(mul `r0 `r0 `r1)
    | Unary_primitive_call (Times_two, operand) ->
        asm ARM.[
          emit_term ~env operand;
          add `r0 `r0 `r0;
        ]
    | Call {name; arguments=[]} ->
        ARM.bl name
    | Call {name; arguments=[x]} ->
        asm ARM.[
          emit_term ~env x;
          bl name;
        ]
    | Call {name; arguments} ->
        asm ARM.[
          (* Allocate stack for max 4 args, 4 bytes each *)
          sub_i `sp `sp 16;

          arguments
          |> List.mapi (fun i arg -> asm ARM.[
               emit_term ~env arg;
               str_i `r0 (`sp, i * 4);
             ])
          |> asm;

          pop [`r0; `r1; `r2; `r3];
          bl name;
        ]
    | Id id ->
        let offset = lookup id env in
        ARM.ldr `r0 (`fp, offset)

  let rec emit_statement ~env = function
    | Assert operand ->
        asm ARM.[
          emit_term ~env operand;
          cmp_i `r0 1;
          mov_i `r0 Char.(code '.') ~condition:EQ;
          mov_i `r0 Char.(code 'F') ~condition:NE;
          bl "putchar";
        ]
    | Exit term ->
        let syscall_number = 1 in
        asm ARM.[
          mov_i `r0 0;
          bl "fflush";
          emit_term ~env term;
          mov_i `r7 syscall_number;
          swi 0;
        ]
    | Block statements ->
        pass ~env statements
    | Expression term ->
        emit_term ~env term
    | Return (Some term) ->
        asm ARM.[
          emit_term ~env term;
          mov `sp `fp;
          pop [`fp; `pc];
        ]
    | Return None ->
        asm ARM.[
          mov_i `r0 0;
          mov `sp `fp;
          pop [`fp; `pc];
        ]
    | If {conditional; consequence; alternative} ->
        let elsif = gensym () in
        let endif = gensym () in
        asm ARM.[
          emit_term ~env conditional;
          cmp_i `r0 0;
          b elsif ~condition:EQ;
          emit_statement ~env consequence;
          b endif;
          label elsif;
          emit_statement ~env alternative;
          label endif;
        ]
    | Function {name; parameters; statements} ->
        let env = parameters
          |> List.mapi (fun i param -> i, param)
          |> fold ~nil:env ~cons:(fun (i, param) env ->
               Entry (param, (i - 4) * 4, env))
        in
        asm ARM.[
          global name;
          label name;

          push [`fp; `lr];
          mov `fp `sp;
          push [`r0; `r1; `r2; `r3];

          pass ~env statements;

          mov `sp `fp;
          pop [`fp; `pc];
        ]

  and pass ~env = function
    | [] -> asm ARM.[]
    | head :: tail ->
        asm ARM.[
          emit_statement ~env head;
          pass ~env tail;
        ]
end


module Test = struct
  let open AST in


  let ast: AST.t = [
    Function {name="main"; parameters=[]; statements=[
      (* Test immediate *)
      Assert (Immediate 1);

      (* Test not *)
      Assert (Not (Immediate 0));
      Assert (Not (Not (Immediate 42)));

      (* Test equal *)
      Assert (Equal (Immediate 42, Immediate 42));
      Assert (Not (Equal (Immediate 0, Immediate 42)));


      (* Test return value and zero params *)
      Assert (Equal (Immediate 42,
        Call {name="return_42"; arguments=[]}));
      Assert (Not (Call {name="return_nothing"; arguments=[]}));

      (* Test one parameter *)
      Assert (Call {name="is_42"; arguments=[Immediate 42]});
      Assert (Not (Call {name="is_42"; arguments=[Immediate 0]}));

      (* Test multi parameters *)
      Assert (Equal (Immediate 23,
        Call {name="tens_ones"; arguments=[Immediate 2; Immediate 3]}));
      Assert (Equal (Immediate 234,
        Call {name="hundreds_tens_ones";
              arguments=[Immediate 2; Immediate 3; Immediate 4]}));

      (* Test if-else *)
      If {
        conditional=Immediate 42;
        consequence=Block [Assert (Immediate 1)];
        alternative=Block [Assert (Immediate 0)];
      };
      If {
        conditional=Immediate 0;
        consequence=Block [Assert (Immediate 0)];
        alternative=Block [Assert (Immediate 1)];
      };

      (* Test large constants *)
      Assert (Equal (Immediate 1234_5678,
                     Add (Immediate 1234_0000, Immediate 5678)));

      Assert (Equal (Immediate 120,
        Call {name="factorial"; arguments=[Immediate 5]}));

      (* Test early exit *)
      Exit (Immediate 0);
      Assert (Immediate 0);

      Expression (Add (
          Subtract (Call {name="times_three"; arguments=[Immediate 10]}, Immediate 1),
          Immediate 100));
    ]};

    Function {name="return_42"; parameters=[]; statements=[
      Return (Some (Immediate 42));
    ]};
    Function {name="return_nothing"; parameters=[]; statements=[
      Expression (Immediate 42);
      Return None;
    ]};
    Function {name="is_42"; parameters=["n"]; statements=[
      Return (Some (Equal (Immediate 42, Id "n")));
    ]};
    Function {name="tens_ones"; parameters=["a"; "b"]; statements=[
      Return (Some (Add (
        Multiply (Immediate 10, Id "a"),
        Id "b")))
    ]};
    Function {name="hundreds_tens_ones"; parameters=["a"; "b"; "c"]; statements=[
      Return (Some (Add (
        Multiply (Immediate 100, Id "a"),
        Add (
          Multiply (Immediate 10, Id "b"),
          Id "c" ))))
    ]};
    Function {name="factorial"; parameters=["n"]; statements=[
      If {
        conditional=(Equal (Immediate 0, Id "n"));
        consequence=(Return (Some (Immediate 1)));
        alternative=(Return (Some (
          Multiply (
            Id "n",
            Call {name="factorial"; arguments=[
              Subtract (Id "n", Immediate 1)
            ]}))));
      }
    ]};

    Function {name="three_times_three"; parameters=[]; statements=[
      Expression (Multiply (Immediate 3, Immediate 3));
    ]};

    Function {name="times_three"; parameters=["one"]; statements=[
      Expression (Multiply (Id "one", Immediate 3));
    ]};

  ] in

  let arm = Emit_assembly.pass ~env:Empty ast in

  printf "%a" ARM.pp arm
end

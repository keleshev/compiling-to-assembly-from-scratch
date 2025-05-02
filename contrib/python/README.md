# Python port of the compiler from Part I of the book

Run `mypy compiler.py` to type-check the compiler. Run `python3 compiler.py > test.s` to generate the assembly.

Tested with Python 3.13 and mypy 1.15 and updated to use the new type annotation syntax. See commit history if you need support for earlier versions.

The compiler closely follows the book. However, unlike in the book, we don't need to define `equals` method because the corresponding Python method `__eq__` is generated for us using the `@dataclass` annotation and we can use the `==` operator.

Also, instead of defining the `or` method, as in the book, this version defined the special `__or__` method which allows to use the `(x | y)` syntax.

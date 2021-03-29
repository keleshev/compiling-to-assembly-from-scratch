CC = arm-linux-gnueabihf-gcc -static
RUN = qemu-arm-static

.PHONY: phony

default: test

test: test.exe phony
	$(RUN) ./$<

%.exe: %.s
	$(CC) $< -o $@

test.s: part-1-compiler.ml
	ocamlc -annot str.cma part-1-compiler.ml && ./a.out > test.s

clean: phony
	rm -f *.exe *.s *.js a.out *.annot *.cmi *.cmo



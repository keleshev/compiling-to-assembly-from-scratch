CC = arm-linux-gnueabihf-gcc -static
RUN = qemu-arm-static

.PHONY: phony

default: test

test: test.exe phony
	$(RUN) ./$<

%.exe: %.s
	$(CC) $< -o $@

test.s: compiler.py
	mypy compiler.py
	python3 compiler.py > test.s

clean: phony
	rm *.exe *.s *.js



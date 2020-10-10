export enum Instruction {
    INC = '+',
    DEC = '-',
    INC_P = '>',
    DEC_P = '<',
    TO_SX = '}',
    FROM_SX = '{',
    TO_TX = ')',
    FROM_TX = '(',
    TO_AX = '\'',
    FROM_AX = '^',
    LOOP_START = '[',
    LOOP_END = ']',
    MEASURE = ',',
    HEAT = '$',
    TRANSFER = '@',
    ISOLATE = '#',
    PRINT = '.',
    COMPILE = '~',
    META = '!'
}
function main() {
    // x y add --- z
    // where z = x + y
    function add(): Instruction[] {
        // [ <+ >- ] <
        return [
            ...while_bf(
                [],
                [Instruction.DEC_P, Instruction.INC],
                [Instruction.INC_P, Instruction.DEC]
            ),
            Instruction.DEC_P
        ];
    }

    // x y sub --- z
    // where z = x - y
    function subtract(): Instruction[] {
        // [ <- >- ] <
        return [
            ...while_bf(
                [],
                [Instruction.DEC_P, Instruction.DEC],
                [Instruction.INC_P, Instruction.DEC]
            ),
            Instruction.DEC_P
        ];
    }

    function eq(): Instruction[] {
        //!(x > y || x < y)
        // x y
        // over over lt < gt > or not

        // <[->-<]+>[[-]<-]
        return [
            ...over(),
            ...over(),
            ...lt(),
            Instruction.DEC_P,
            ...gt(),
            // Instruction.INC_P,
            // ...or(),
            // ...not()
        ];
    }

    function if_bf(then_branch: Instruction[], else_branch?: Instruction[]): Instruction[] {
        if (!else_branch) {
            // [[-] then_branch]
            return [
                Instruction.LOOP_START,
                ...decToZero(),
                ...then_branch,
                Instruction.LOOP_END
            ];
        }

        // x -- w 0 1
        // >+            ; push 1 (y)
        // <[            ; if x
        //   [-]         ; dec x to zero
        //   >-          ; dec y
        //   < then_branch ; then branch from x
        //   >             ; go to y
        // ]
        // >[               ; if y
        //   -              ; dec y
        //   < else_branch ; else branch from x
        //   >             ; goto y
        // ]
        // <               ; back to x
        return [
            ...push(1),
            Instruction.DEC_P,
            Instruction.LOOP_START,
            ...decToZero(),
            Instruction.INC_P, Instruction.DEC,
            Instruction.DEC_P,
            ...then_branch,
            Instruction.INC_P,
            Instruction.LOOP_END,
            Instruction.INC_P,
            Instruction.LOOP_START,
            Instruction.DEC,
            Instruction.DEC_P,
            ...else_branch,
            Instruction.INC_P,
            Instruction.LOOP_END,
            Instruction.DEC_P
        ];
    }

    function and(): Instruction[] {
        // if (x) {
        //   if (y) {
        //      x +
        //   } else {
        //      x
        //   }
        // } else {
        //    y[-]
        //    x
        // }
        
        return [
            Instruction.DEC_P,
            ...if_bf(
                [
                    Instruction.INC_P,
                    ...if_bf([Instruction.DEC_P, Instruction.INC], [Instruction.DEC_P]),
                ],
                [
                    Instruction.INC_P,
                    ...decToZero(),
                    Instruction.DEC_P
                ]
            )
        ];
    }

    function or(): Instruction[] {
        // if(x) {
        //   y[-]
        //   x +
        // } else {
        //   if(y) {
        //     x +
        //   }
        // }

        return [
            Instruction.DEC_P,
            ...if_bf(
                [
                    Instruction.INC_P,
                    ...decToZero(),
                    Instruction.DEC_P,
                    Instruction.INC_P
                ],
                [
                    Instruction.INC_P,
                    ...if_bf([Instruction.DEC_P, Instruction.INC])
                ]
            )
        ];
    }

    function not(): Instruction[] {
        // if (x) {
        //   0
        // } else {
        //    1
        // }
        return if_bf([], [Instruction.INC]);
    }

    function gt(): Instruction[] {
        // x - y > 0
        // x y sub 0= !
        return [
            ...subtract(),
            // ...eqZero(),
            // ...not()
        ];
    }

    function lt(): Instruction[] {
        // y - x > 0
        // swap sub 0= !
        return [
            ...swap(),
            ...subtract(),
            ...eqZero(),
            ...not()
        ];
    }
    
    // x --- z
    // where z = x == 0
    function eqZero(): Instruction[] {
        // if(x) {
        //   0
        // } else {
        //   1
        // }
        return not();
    }
    
    function push(value: number): Instruction[] {
        return [
            Instruction.INC_P,
            ...incToValue(value)
        ];
    }

    function drop(): Instruction[] {
        return [
            ...decToZero(),
            Instruction.DEC_P
        ];
    }

    function decToZero(): Instruction[] {
        return while_bf([], [Instruction.DEC], []);
    }

    // x -- x x
    function dup(): Instruction[] {
        return copy(0);
    }

    // x y -- y x
    function swap(): Instruction[] {
        // <[>>+<<-]>[<+>-]>[<+>-]<
        return [
            ...while_bf(
                [Instruction.DEC_P],
                [Instruction.INC_P, Instruction.INC_P, Instruction.INC],
                [Instruction.DEC_P, Instruction.DEC_P, Instruction.DEC]
            ),
            ...while_bf(
                [Instruction.INC_P],
                [Instruction.DEC_P, Instruction.INC],
                [Instruction.INC_P, Instruction.DEC]
            ),
            ...while_bf(
                [Instruction.INC_P],
                [Instruction.DEC_P, Instruction.INC],
                [Instruction.INC_P, Instruction.DEC]
            ),
            Instruction.DEC_P
        ];
    }

    function while_bf(condition: Instruction[], body: Instruction[], conditionModify: Instruction[]) {
        return [
            ...condition,
            Instruction.LOOP_START,
            ...body,
            ...conditionModify,
            Instruction.LOOP_END
        ];
    }
    
    // from ... --- from ... from
    function copy(from: number): Instruction[] {
        // <{from}        ; get down to from
        // [              ; while from
        //   >{from + 1}+ ; go to the top of the stack (y) and increment
        //   >+           ; increment the next place on the stack (z) too
        //   <{from + 2}- ; decrement from
        // ]
        // >{from + 2}    ; go to z
        // [              ; while z
        //   <{from + 2}+ ; increment from
        //   >{from + 2}- ; decrement z
        // ]
        // <              ; go to y
        // <{from}[ >{from}+ >+ <{from}- ]>{from + 1}[ <{from + 1}+ >{from + 1}-]<
        return [
            ...while_bf(
                repeat(Instruction.DEC_P, from),
                [
                    ...repeat(Instruction.INC_P, from + 1), Instruction.INC,
                    Instruction.INC_P, Instruction.INC
                ],
                [...repeat(Instruction.DEC_P, from + 2), Instruction.DEC]
            ),
            ...while_bf(
                repeat(Instruction.INC_P, from + 2),
                [...repeat(Instruction.DEC_P, from + 2), Instruction.INC],
                [...repeat(Instruction.INC_P, from + 2), Instruction.DEC]
            ),
            Instruction.DEC_P
        ];
    }
    
    // a b --- a b a
    function over(): Instruction[] {
        return copy(1);
    }
    
    function incToValue(value: number): Instruction[] {
        const base = 10;
        const r = value % base;
        const q = (value - r) / base;
        if (q <= 1) {
            return repeat(Instruction.INC, value);
        } else {
            return [
                Instruction.INC_P,
                ...incToValue(q),
                Instruction.LOOP_START,
                Instruction.DEC_P,
                ...repeat(Instruction.INC, base),
                Instruction.INC_P,
                Instruction.DEC,
                Instruction.LOOP_END,
                Instruction.DEC_P,
                ...repeat(Instruction.INC, r)
            ];
        }
    }

    function repeat(instruction: Instruction, times: number): Instruction[] {
        return Array(times).fill(instruction);
    }

    console.log([...push(5), ...push(5), ...eq()].join(''))
}

main();

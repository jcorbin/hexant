@preprocessor module

spec -> assigns:? rules {%
  ([assigns, rules]) => ({type: 'spec', assigns: assigns || [], rules}) %}

assigns -> assign
         | assign newline assigns {% ([head, _1, tail]) => [head].concat(tail) %}

assign -> identifier _ "=" _ lit  {% ([id, _1, _2, _3, value]) => ({type: 'assign', id, value}) %}

rules -> rule
       | rule newline rules  {% ([head, _1, tail]) => [head].concat(tail) %}

rule -> when "=>" then  {% ([when, _1, then]) => ({type: 'rule', when, then}) %}

when -> expr "," expr  {% ([state, _1, color]) => ({type: 'when', state, color}) %}

then -> thenState "," thenColor "," thenTurn  {% ([state, _1, color, _3, turn]) => ({type: 'then', state, color, turn}) %}

thenMode -> null  {% () => '=' %}
          | "="   {% () => '=' %}
          | "|"   {% () => '|' %}

thenNoop -> _ "_" _ {% () => ({type: 'thenVal', mode: '_'}) %}

thenState -> thenNoop          {% d => d[0] %}
           | _ thenMode sum _  {% ([_0, mode, value]) => ({type: 'thenVal', mode, value}) %}

thenColor -> thenNoop          {% d => d[0] %}
           | _ thenMode sum _  {% ([_0, mode, value]) => ({type: 'thenVal', mode, value}) %}

thenTurn -> thenNoop               {% d => d[0] %}
          | _ thenMode sum _       {% ([_0, mode, value]) => ({type: 'thenVal', mode, value}) %}
          | _ thenMode turnExpr _  {% ([_0, mode, value]) => ({type: 'thenVal', mode, value}) %}

turnExpr -> turn                   {% ([name]) => ({type: 'turn', names: [name]}) %}
          | turnExpr "|" turnExpr  {% ([a, _1, b]) => ({type: 'turn', names: a.names.concat(b.names)}) %}

expr -> _ sum _  {% d => d[1] %}

sumop -> _ "+" _  {% d => d[1] %}
       | _ "-" _  {% d => d[1] %}

mulop -> _ "*" _  {% d => d[1] %}
       | _ "/" _  {% d => d[1] %}
       | _ "%" _  {% d => d[1] %}

sum -> sum sumop mul  {% ([arg1, op, arg2]) => ({type: 'expr', op, arg1, arg2}) %}
     | mul            {% d => d[0] %}

mul -> mul mulop fac  {% ([arg1, op, arg2]) => ({type: 'expr', op, arg1, arg2}) %}
     | fac            {% d => d[0] %}

fac -> "(" expr ")"  {% d => d[1] %}
     | lit           {% d => d[0] %}
     | member        {% d => d[0] %}
     | symbol        {% d => d[0] %}
     | identifier    {% d => d[0] %}

turns -> "turns(" _ countTurn ( __ countTurn ):* _ ")"  {% ([_0, _1, first, rest=[]]) => ({type: 'turns', value: [first, ...rest.map(rr => rr[1])]}) %}

turn -> "L"  {% () => 'RelLeft'        %}
      | "R"  {% () => 'RelRight'       %}
      | "F"  {% () => 'RelForward'     %}
      | "B"  {% () => 'RelBackward'    %}
      | "P"  {% () => 'RelDoubleLeft'  %}
      | "S"  {% () => 'RelDoubleRight' %}
      | "l"  {% () => 'RelLeft'        %}
      | "r"  {% () => 'RelRight'       %}
      | "f"  {% () => 'RelForward'     %}
      | "b"  {% () => 'RelBackward'    %}
      | "p"  {% () => 'RelDoubleLeft'  %}
      | "s"  {% () => 'RelDoubleRight' %}
      | "NW" {% () => 'AbsNorthWest'   %}
      | "NO" {% () => 'AbsNorth'       %}
      | "NE" {% () => 'AbsNorthEast'   %}
      | "SE" {% () => 'AbsSouthEast'   %}
      | "SO" {% () => 'AbsSouth'       %}
      | "SW" {% () => 'AbsSouthWest'   %}
      | "nw" {% () => 'AbsNorthWest'   %}
      | "no" {% () => 'AbsNorth'       %}
      | "ne" {% () => 'AbsNorthEast'   %}
      | "se" {% () => 'AbsSouthEast'   %}
      | "so" {% () => 'AbsSouth'       %}
      | "sw" {% () => 'AbsSouthWest'   %}

countTurn ->        turn  {% ([turn]) => ({count: {type: 'number', value: 1}, turn}) %}
           | decint turn  {% ([count, turn]) => ({count, turn}) %}

member -> ( member | symbol | identifier | lit ) "[" expr "]"  {% ([[value], _1, item]) => ({type: 'member', value, item}) %}

symbol -> [a-z] [\w]:*  {% ([head, tail]) => ({type: 'symbol', name: head + tail.join('')}) %}

identifier -> [A-Z] [\w]:+  {% ([head, tail]) => ({type: 'identifier', name: head + tail.join('')}) %}

lit -> int    {% d => d[0] %}
     | turns  {% d => d[0] %}

int -> "0x" hexint  {% d => d[1] %}
     |      decint  {% d => d[0] %}

hexint -> [0-9a-fA-F]:+  {% ([head]) => ({type: 'number', value: parseInt(head.join(''), 16), base: 16}) %}
decint -> [0-9]:+        {% ([head]) => ({type: 'number', value: parseInt(head.join(''), 10)}) %}

_ -> [\s]:*  {% () => null %}
__ -> [\s]:+  {% () => null %}
newline -> "\r":? "\n"  {% () => null %}

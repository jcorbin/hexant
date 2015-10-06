@{% var build = require('./build.js'); %}

spec -> assigns:? rules  {% build.spec %}

assigns -> assign
         | assign newline assigns  {% build.rightConcat %}

assign -> identifier _ "=" _ lit  {% build.assign %}

rules -> rule
       | rule newline rules  {% build.rightConcat %}

rule -> when "=>" then  {% build.rule %}

when -> expr "," expr  {% build.when %}

then -> thenState "," thenColor "," thenTurn  {% build.then %}

thenMode -> null  {% build.just('|') %}
          | "|"   {% build.item(0) %}

thenState -> _ thenMode sum _  {% build.thenVal %}

thenColor -> _ thenMode sum _  {% build.thenVal %}

thenTurn -> _ thenMode sum _       {% build.thenVal %}
          | _ thenMode turnExpr _  {% build.thenVal %}

turnExpr -> turn                   {% build.turn %}
          | turnExpr "|" turnExpr  {% build.multiTurn %}

expr -> _ sum _  {% build.item(1) %}

sumop -> _ "+" _  {% build.item(1) %}
       | _ "-" _  {% build.item(1) %}

mulop -> _ "*" _  {% build.item(1) %}
       | _ "/" _  {% build.item(1) %}
       | _ "%" _  {% build.item(1) %}

sum -> sum sumop mul  {% build.expr %}
     | mul            {% build.item(0) %}

mul -> mul mulop fac  {% build.expr %}
     | fac            {% build.item(0) %}

fac -> "(" expr ")"  {% build.item(1) %}
     | lit           {% build.item(0) %}
     | member        {% build.item(0) %}
     | symbol        {% build.item(0) %}
     | identifier    {% build.item(0) %}

turns -> "turns(" _ countTurn ( __ countTurn ):* _ ")"  {% build.turns %}

turn -> "L"  {% function() {return 'RelLeft'}        %}
      | "R"  {% function() {return 'RelRight'}       %}
      | "F"  {% function() {return 'RelForward'}     %}
      | "B"  {% function() {return 'RelBackward'}    %}
      | "P"  {% function() {return 'RelDoubleLeft'}  %}
      | "S"  {% function() {return 'RelDoubleRight'} %}
      | "l"  {% function() {return 'RelLeft'}        %}
      | "r"  {% function() {return 'RelRight'}       %}
      | "f"  {% function() {return 'RelForward'}     %}
      | "b"  {% function() {return 'RelBackward'}    %}
      | "p"  {% function() {return 'RelDoubleLeft'}  %}
      | "s"  {% function() {return 'RelDoubleRight'} %}
      | "NW" {% function() {return 'AbsNorthWest'}   %}
      | "NO" {% function() {return 'AbsNorth'}       %}
      | "NE" {% function() {return 'AbsNorthEast'}   %}
      | "SE" {% function() {return 'AbsSouthEast'}   %}
      | "SO" {% function() {return 'AbsSouth'}       %}
      | "SW" {% function() {return 'AbsSouthWest'}   %}
      | "nw" {% function() {return 'AbsNorthWest'}   %}
      | "no" {% function() {return 'AbsNorth'}       %}
      | "ne" {% function() {return 'AbsNorthEast'}   %}
      | "se" {% function() {return 'AbsSouthEast'}   %}
      | "so" {% function() {return 'AbsSouth'}       %}
      | "sw" {% function() {return 'AbsSouthWest'}   %}

countTurn ->        turn  {% build.singleTurn %}
           | decint turn  {% build.countTurn %}

member -> ( member | symbol | identifier | lit ) "[" expr "]"  {% build.member %}

symbol -> [a-z] [\w]:*  {% build.symbol %}

identifier -> [A-Z] [\w]:+  {% build.identifier %}

lit -> int    {% build.item(0) %}
     | turns  {% build.item(0) %}

int -> "0x" hexint  {% build.item(1) %}
     |      decint  {% build.item(0) %}

hexint -> [0-9a-fA-F]:+  {% build.int(16) %}
decint -> [0-9]:+        {% build.int(10) %}

_ -> [\s]:*  {% build.noop %}
__ -> [\s]:+  {% build.noop %}
newline -> "\r":? "\n"  {% build.noop %}

/* eslint no-multi-spaces:0 */

'use strict';

module.exports = RLEBuilder;

function RLEBuilder(prefix, sep, suffix) {
    build.prefix = prefix;
    build.sep    = sep;
    build.suffix = suffix;
    build.cur    = '';
    build.count  = 0;
    build.str    = build.prefix;
    build.init   = true;
    return build;

    function build(mult, sym) {
        if (build.cur !== sym) {
            if (build.cur && build.count) {
                if (build.init) {
                    build.init = false;
                } else {
                    build.str += build.sep;
                }
                if (build.count > 1) {
                    build.str += build.count.toString();
                }
                build.str += build.cur;
            }
            build.cur = sym || '';
            build.count = 0;
        }
        if (mult === 0 && !sym) {
            var ret     = build.str + build.suffix;
            build.cur   = '';
            build.count = 0;
            build.str   = build.prefix;
            build.init  = false;
            return ret;
        }
        build.count += mult;
        return '';
    }
}

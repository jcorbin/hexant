module.exports.add = add;
module.exports.sub = sub;

/* eslint-disable max-statements */

function add(rl, begin, end) {
    if (end < begin) {
        throw new Error("invalid range");
    }

    // won't add degenerate ranges
    if (end === begin) {
        return;
    }

    // find begin
    // TODO: use binary search
    var found = false;
    var i = 0;
    for (; i < rl.length; i += 2) {
        if (begin <= rl[i]-1) {
            // ... @i:[begin <= a-1 < b] ...
            rl[i] = begin;
            found = true;
            break;
        }
        if (begin <= rl[i+1]+1) {
            // ... @i:[a < begin <= b+1] ...
            found = true;
            break;
        }
    }
    // ... < [end < begin]
    if (!found) {
        rl.push(begin, end);
        return;
    }

    // seek end
    var j = i;
    found = false;
    for (; j < rl.length; j += 2) {
        if (end < rl[j]-1) {
            // ... @i:[a <= begin <= b] ... @j:[end < c-1 < d] ...
            if (j === i) {
                throw new Error("degenerate range detected"); // should not be possible
            }
            found = true;
            break;
        }
        if (end <= rl[j+1]+1) {
            // ... @i:[a <= begin <= b] ... @j:[c < end <= d+1] ...
            if (j === i) {
                // ... @i:[a <= begin < end <= b] ...
                return;
            }
            end = rl[j+1] + (end === rl[j+1]+1 ? 1 : 0);
            j += 2;
            found = true;
            break;
        }
    }
    // ... @i:[a-1 <= begin < b] ...coalesced... < end
    if (!found) {
        rl[i+1] = end;
        rl.length = i+2;
        return;
    }

    // coalesce
    // ... @i:[a-1 <= begin < end] ...coalesced... @j ...tail...
    rl[i+1] = end;
    i += 2;
    if (i == j) {
        return;
    }
    // TODO: rl.copyWithin
    while (j < rl.length) {
        rl[i++] = rl[j++];
        rl[i++] = rl[j++];
    }
    rl.length = i;
    return;
}

function sub(rl, begin, end) {
    if (end < begin) {
        throw new Error("invalid range");
    }

    // won't sub degenerate ranges
    if (end === begin) {
        return;
    }

    // var i = -1; // begin index
    // var j = -1; // end index
    // for (var k = 0; k < rl.length; k+=2) {
    //     if (i < 0 && (
    //         (rl[k] <= begin && begin <= rl[k+1]) ||
    //         (begin <= rl[k] && end >= rl[k+1])
    //     )) {
    //         i = k;
    //         if (j >= 0) break;
    //     }
    //     if (j < 0 && (
    //         end < rl[k] ||
    //         (rl[k] <= end && end <= rl[k+1])
    //     )) {
    //         j = k;
    //         if (i >= 0) break;
    //     }
    // }

    // if (i >= 0) {
    //     if (begin === rl[i]) {
    //         i += 2;
    //     } else if (begin > rl[i]) {
    //         if (end < rl[i+1]) {
    //             rl.push(0, 0);
    //             // rl.copyWithin(rl.length - 1, i+2, rl.length - 3);
    //             var h = rl.length - 3;
    //             var l = i+2;
    //             var t = rl.length - 1;
    //             while (h >= l) rl[t--] = rl[h--];
    //             rl[i+2] = end+1;
    //             rl[i+3] = rl[i+1];
    //         }
    //         rl[i+1] = begin-1
    //         i += 2;
    //     }
    // }
    // if (j >= 0 && end < rl[j+1]) {
    //     rl[j] = end+1;
    // }

    // if (i < j) {
    //     while (j < rl.length) {
    //         rl[i++] = rl[j++];
    //         rl[i++] = rl[j++];
    //     }
    //     rl.length = i;
    // }

}

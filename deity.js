'use strict';

var World = require('./world.js');
var Turmite = require('./turmite/index.js');
var gen = require('./turmite/gen.js');

module.exports = Deity;

function Deity() {
    this.score = Deity.scores.growthRate;
    this.cutoff = 0.001;
    this.endStep = 10000;
    this.neededPriors = 5;
    this.genRounds = 100;
}

Deity.scores = {};

// one of the naivest scores score: number of visited cells/step
Deity.scores.growthRate =
function growthRate(world) {
    var score = 0;
    world.tile.eachTile(function eachTile(tile) {
        score += tile.count(World.FlagVisited);
    });
    score /= world.stepCount;
    // TODO: detect and punish highways instead of this:
    // HACK: NOBODY does that good!
    if (score > 0.95) {
        score = 0;
    }
    return score;
};

Deity.prototype.incept =
function incept(world, priorState) {
    return new DeityState(this, world, priorState);
};

function DeityState(deity, world, priorState) {
    this.deity = deity;
    this.done = false;
    this.cutoff = false;
    this.turmiteRules = null;
    this.expected = 0;
    this.priorRules = [];
    this.priorScores = [];
    // TODO: rather than storing entire rule tables, we could extract salient
    // sections (features?) from them; probably has a lot of crossover with
    // generation and similarity scoring

    if (priorState !== null) {
        this.priorRules = this.priorRules.concat(priorState.priorRules);
        this.priorScores = this.priorScores.concat(priorState.priorScores);
    }

    for (var i = 0; i < world.ents.length; ++i) {
        var ent = world.ents[i];
        if (ent instanceof Turmite) {
            // TODO: support multi-turmite worlds
            if (this.turmiteRules !== null) {
                this.turmiteRules = null;
                break;
            }
            this.turmiteRules = ent.rules;
        }
    }
    if (this.turmiteRules !== null) {
        this.turmiteRules = new Uint32Array(this.turmiteRules);
        this.expected = this.scoreRules(this.turmiteRules);
    }
}

DeityState.prototype.wrapTitle =
function wrapTitle(title) {
    title = '^ ' + title;
    if (this.priorRules.length > 0) {
        var i = this.priorRules.length - 1;
        var expected = this.priorScores[2*i];
        var score = this.priorScores[2*i+1];
        // TODO: better description of score recent history
        expected = Math.round(expected * 1000) / 10;
        score = Math.round(score * 1000) / 10;
        title = '^[' + expected + '% : ' + score + '%]' + title;
    }
    return title;
};

DeityState.prototype.update =
function update(world) {
    if (this.turmiteRules === null) {
        return;
    }
    this.done = world.stepCount >= this.deity.endStep;
    if (!this.done && !this.cutoff &&
        world.stepCount / this.deity.endStep > 0.1) {
        this.done = this.deity.score(world) < this.deity.cutoff;
        this.cutoff = true;
    }
};

DeityState.prototype.nextEnts =
function nextEnts(world) {
    if (!this.done) {
        return null;
    }
    if (this.turmiteRules !== null) {
        // store score and ruleset
        var score = this.deity.score(world);
        this.priorRules.push(this.turmiteRules);
        this.priorScores.push(this.expected, score);
        this.turmiteRules = null;
    }
    return [this.genScoredEnt(this.deity.genRounds)];
};

DeityState.prototype.scoreRules =
function scoreRules(rules) {
    var score = 0;
    for (var i = 0; i < this.priorRules.length; ++i) {
        var sim = gen.rulesSimilarity(rules, this.priorRules[i]);
        var priorScore = this.priorScores[2*i+1];
        score += sim * priorScore / this.priorRules.length;
    }
    return score;
};

DeityState.prototype.genScoredEnt =
function genScoredEnt(n) {
    // we need at least this much history to score
    if (this.priorRules.length < this.deity.neededPriors) {
        return gen.randomAnt();
    }

    var best = null, bestScore = 0;
    for (var i = 0; i < n; ++i) {
        var ent = gen.randomAnt();
        var score = this.scoreRules(ent.rules);
        if (best === null || score > bestScore) {
            best = ent;
            bestScore = score;
        }
    }
    this.expected = bestScore;
    return best;
};

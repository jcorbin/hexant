'use strict';

var World = require('./world.js');
var Turmite = require('./turmite/index.js');
var gen = require('./turmite/gen.js');

module.exports = Deity;

function Deity() {
    this.score = Deity.scores.explored;
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
    return score - 0.05;
};

// a slightly less naived score: explored/unexplored space
Deity.scores.explored =
function explored(world) {
    var score = 0;
    world.tile.eachTile(function eachTile(tile) {
        score += tile.count(World.FlagVisited);
    });
    var box = world.tile.boundingBox();
    var size =
        Math.abs(box.bottomRight.q - box.topLeft.q) *
        Math.abs(box.bottomRight.r - box.topLeft.r);
    score /= size;
    return score - 0.05;
};

Deity.prototype.incept =
function incept(world, priorState) {
    return new DeityState(this, world, priorState);
};

function DeityState(deity, world, priorState) {
    this.deity = deity;
    this.done = false;
    this.cutoff = false;
    this.currentSpec = null;
    this.expected = 0;
    this.priorSpecs = [];
    this.priorScores = [];
    // TODO: rather than storing entire rule tables, we could extract salient
    // sections (features?) from them; probably has a lot of crossover with
    // generation and similarity scoring

    if (priorState !== null) {
        this.priorSpecs = this.priorSpecs.concat(priorState.priorSpecs);
        this.priorScores = this.priorScores.concat(priorState.priorScores);
    }

    for (var i = 0; i < world.ents.length; ++i) {
        var ent = world.ents[i];
        if (ent instanceof Turmite) {
            // TODO: support multi-turmite worlds
            if (this.currentSpec !== null) {
                this.currentSpec = null;
                break;
            }
            this.currentSpec = ent.specString;
        }
    }
    this.expected = this.scoreSpec(this.currentSpec);
}

DeityState.prototype.wrapTitle =
function wrapTitle(title) {
    title = '^ ' + title;
    if (this.priorSpecs.length > 0) {
        var i = this.priorSpecs.length - 1;
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
    if (this.currentSpec === null) {
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
    if (this.currentSpec !== null) {
        // store score and spec
        var score = this.deity.score(world);
        this.priorSpecs.push(this.currentSpec);
        this.priorScores.push(this.expected, score);
        this.currentSpec = null;
    }
    return [this.genScoredEnt(this.deity.genRounds)];
};

DeityState.prototype.scoreSpec =
function scoreSpec(spec) {
    var score = 0;
    for (var i = 0; i < this.priorSpecs.length; ++i) {
        var sim = gen.specSimilarity(spec, this.priorSpecs[i])
        var priorScore = this.priorScores[2*i+1];
        score += sim * priorScore / this.priorSpecs.length;
    }
    return score;
};

DeityState.prototype.genScoredEnt =
function genScoredEnt(n) {
    // we need at least this much history to score
    if (this.priorSpecs.length < this.deity.neededPriors) {
        return gen.randomAnt();
    }

    var best = null, bestScore = 0;
    for (var i = 0; i < n; ++i) {
        var ent = gen.randomAnt();
        var score = this.scoreSpec(ent.specString);
        if (best === null || score > bestScore) {
            best = ent;
            bestScore = score;
        }
    }
    this.expected = bestScore;
    return best;
};

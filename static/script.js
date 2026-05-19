document.addEventListener("DOMContentLoaded", function () {
    const grid = document.getElementById("grid");
    if (!grid) return;

    const n = parseInt(grid.dataset.n, 10);
    const maxObstacles = parseInt(grid.dataset.maxObstacles, 10);
    const statusBar = document.getElementById("status-bar");
    const obstacleCountEl = document.getElementById("obstacle-count");

    let startCell = null;
    let endCell = null;
    let obstacles = [];

    // ========== Grid Interaction ==========

    function updateStatus() {
        if (!startCell) {
            statusBar.innerHTML = 'Click a cell to set the <strong>start point</strong>.';
        } else if (!endCell) {
            statusBar.innerHTML = 'Click a cell to set the <strong>end point</strong>.';
        } else if (obstacles.length < maxObstacles) {
            const remaining = maxObstacles - obstacles.length;
            statusBar.innerHTML = 'Click to place <strong>obstacles</strong> — ' + remaining + ' remaining.';
        } else {
            statusBar.innerHTML = '✅ All set! Start, end, and all obstacles are placed.';
        }
        obstacleCountEl.textContent = obstacles.length;
    }

    grid.addEventListener("click", function (e) {
        const cell = e.target.closest(".cell");
        if (!cell) return;

        if (cell === startCell) {
            cell.classList.remove("start");
            startCell = null;
            updateStatus();
            return;
        }

        if (cell === endCell) {
            cell.classList.remove("end");
            endCell = null;
            updateStatus();
            return;
        }

        if (cell.classList.contains("obstacle")) {
            cell.classList.remove("obstacle");
            obstacles = obstacles.filter(function (o) { return o !== cell; });
            updateStatus();
            return;
        }

        if (!startCell) {
            cell.classList.add("start");
            startCell = cell;
            updateStatus();
            return;
        }

        if (!endCell) {
            cell.classList.add("end");
            endCell = cell;
            updateStatus();
            return;
        }

        if (obstacles.length < maxObstacles) {
            cell.classList.add("obstacle");
            obstacles.push(cell);
            updateStatus();
            return;
        }
    });

    updateStatus();

    // ========== Shared helpers ==========

    function isObstacle(r, c) {
        return obstacles.some(function (o) {
            return parseInt(o.dataset.row, 10) === r && parseInt(o.dataset.col, 10) === c;
        });
    }

    function getCoords() {
        return {
            startRow: startCell ? parseInt(startCell.dataset.row, 10) : -1,
            startCol: startCell ? parseInt(startCell.dataset.col, 10) : -1,
            endRow: endCell ? parseInt(endCell.dataset.row, 10) : -1,
            endCol: endCell ? parseInt(endCell.dataset.col, 10) : -1,
            obstacleCoords: obstacles.map(function (o) {
                return [parseInt(o.dataset.row, 10), parseInt(o.dataset.col, 10)];
            })
        };
    }

    function renderMatrixTable(targetEl, getCellValue, getCellClass) {
        let html = '<table class="matrix-table">';
        html += '<tr><th></th>';
        for (let c = 0; c < n; c++) html += '<th>' + c + '</th>';
        html += '</tr>';
        for (let r = 0; r < n; r++) {
            html += '<tr><th>' + r + '</th>';
            for (let c = 0; c < n; c++) {
                const cls = getCellClass(r, c) || "";
                html += '<td class="' + cls + '">' + getCellValue(r, c) + '</td>';
            }
            html += '</tr>';
        }
        html += '</table>';
        targetEl.innerHTML = html;
    }

    function valueCellClass(r, c) {
        if (startCell && parseInt(startCell.dataset.row, 10) === r && parseInt(startCell.dataset.col, 10) === c) return "cell-start";
        if (endCell && parseInt(endCell.dataset.row, 10) === r && parseInt(endCell.dataset.col, 10) === c) return "cell-end";
        if (isObstacle(r, c)) return "cell-obstacle";
        return "";
    }

    // ========== HW1-2: Random Policy + Policy Evaluation ==========

    const genRandomBtn = document.getElementById("gen-random-btn");
    const runPeBtn = document.getElementById("run-pe-btn");
    const randomSection = document.getElementById("random-section");
    const randomPolicyEl = document.getElementById("random-policy-matrix");
    const randomValueEl = document.getElementById("random-value-matrix");
    const peStatus = document.getElementById("pe-status");

    let randomPolicy = null;

    function renderRandomPolicy() {
        if (!randomPolicy) return;
        renderMatrixTable(
            randomPolicyEl,
            function (r, c) {
                const sym = randomPolicy[r][c];
                return sym === "■" ? "" : sym;
            },
            function (r, c) {
                let base = "policy-cell";
                if (isObstacle(r, c)) return base + " cell-obstacle";
                if (randomPolicy[r][c] === "★") return base + " cell-end";
                if (startCell && parseInt(startCell.dataset.row, 10) === r && parseInt(startCell.dataset.col, 10) === c) return base + " cell-start";
                return base;
            }
        );
    }

    function renderRandomValue(matrix) {
        renderMatrixTable(
            randomValueEl,
            function (r, c) { return matrix[r][c].toFixed(2); },
            valueCellClass
        );
    }

    function fetchRandomPolicy() {
        const { endRow, endCol, obstacleCoords } = getCoords();
        return fetch("/api/random-policy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                n: n,
                end: [endRow, endCol],
                obstacles: obstacleCoords
            })
        })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                randomPolicy = data.policy;
                randomSection.style.display = "block";
                renderRandomPolicy();
                return randomPolicy;
            });
    }

    if (genRandomBtn) {
        genRandomBtn.addEventListener("click", function () {
            if (!endCell) {
                statusBar.innerHTML = '⚠️ Please set the <strong>end point</strong> first.';
                return;
            }
            fetchRandomPolicy()
                .then(function () {
                    randomValueEl.innerHTML = '<p class="placeholder">Click "Run Policy Evaluation" to compute V<sup>π</sup>(s).</p>';
                    if (peStatus) peStatus.textContent = "";
                    statusBar.innerHTML = '🎲 Random policy generated. Click "Run Policy Evaluation" to compute V<sup>π</sup>(s) (optional).';
                })
                .catch(function (err) {
                    console.error(err);
                    statusBar.innerHTML = '❌ Error generating random policy.';
                });
        });
    }

    if (runPeBtn) {
        runPeBtn.addEventListener("click", function () {
            if (!endCell) {
                statusBar.innerHTML = '⚠️ Please set the <strong>end point</strong> first.';
                return;
            }

            const gamma = parseFloat(document.getElementById("gamma-input").value) || 0.9;
            const rewardStep = parseFloat(document.getElementById("reward-step-input").value);
            const rewardGoal = parseFloat(document.getElementById("reward-goal-input").value);

            runPeBtn.disabled = true;
            runPeBtn.textContent = "⏳ Evaluating...";

            const ensurePolicy = randomPolicy ? Promise.resolve(randomPolicy) : fetchRandomPolicy();

            ensurePolicy
                .then(function () {
                    const { endRow, endCol, obstacleCoords } = getCoords();
                    return fetch("/api/policy-evaluation", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            n: n,
                            end: [endRow, endCol],
                            obstacles: obstacleCoords,
                            policy: randomPolicy,
                            gamma: gamma,
                            reward_step: rewardStep,
                            reward_goal: rewardGoal
                        })
                    });
                })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    const finalV = data.iterations[data.iterations.length - 1];
                    renderRandomValue(finalV);
                    if (peStatus) {
                        peStatus.innerHTML =
                            (data.converged ? '✅ Converged' : '⚠️ Reached max iterations') +
                            ' in <strong>' + data.num_iterations + '</strong> sweeps · γ=' + gamma;
                    }
                    runPeBtn.disabled = false;
                    runPeBtn.textContent = "▶ Run Policy Evaluation";
                    statusBar.innerHTML = '✅ Policy Evaluation done in <strong>' + data.num_iterations + '</strong> sweeps.';
                })
                .catch(function (err) {
                    console.error(err);
                    runPeBtn.disabled = false;
                    runPeBtn.textContent = "▶ Run Policy Evaluation";
                    statusBar.innerHTML = '❌ Error running Policy Evaluation.';
                });
        });
    }

    // ========== HW1-3: Value Iteration ==========

    const runBtn = document.getElementById("run-vi-btn");
    const iterSection = document.getElementById("iteration-section");
    const iterSlider = document.getElementById("iter-slider");
    const iterLabel = document.getElementById("iter-label");
    const valueMatrixEl = document.getElementById("value-matrix");
    const policyMatrixEl = document.getElementById("policy-matrix");
    const playBtn = document.getElementById("play-btn");

    let iterationsData = [];
    let policyData = [];
    let pathData = [];
    let playInterval = null;

    const pathSection = document.getElementById("path-section");
    const pathDisplay = document.getElementById("path-display");
    const pathInfo = document.getElementById("path-info");

    if (runBtn) {
        runBtn.addEventListener("click", function () {
            if (!startCell || !endCell) {
                statusBar.innerHTML = '⚠️ Please set both <strong>start</strong> and <strong>end</strong> points first.';
                return;
            }

            const gamma = parseFloat(document.getElementById("gamma-input").value) || 0.9;
            const rewardStep = parseFloat(document.getElementById("reward-step-input").value);
            const rewardGoal = parseFloat(document.getElementById("reward-goal-input").value);

            const { startRow, startCol, endRow, endCol, obstacleCoords } = getCoords();

            runBtn.disabled = true;
            runBtn.textContent = "⏳ Computing...";

            fetch("/api/value-iteration", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    n: n,
                    start: [startRow, startCol],
                    end: [endRow, endCol],
                    obstacles: obstacleCoords,
                    gamma: gamma,
                    reward_step: rewardStep,
                    reward_goal: rewardGoal
                })
            })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    iterationsData = data.iterations;
                    policyData = data.policy;

                    iterSlider.max = iterationsData.length - 1;
                    iterSlider.value = 0;
                    iterSection.style.display = "block";

                    renderIteration(0);
                    renderPolicy();
                    updateIterLabel();

                    pathData = data.optimal_path || [];
                    renderPath();

                    runBtn.disabled = false;
                    runBtn.textContent = "▶ Run Value Iteration";

                    statusBar.innerHTML = '✅ Value Iteration converged in <strong>' + data.num_iterations + '</strong> iterations.';
                })
                .catch(function (err) {
                    console.error(err);
                    runBtn.disabled = false;
                    runBtn.textContent = "▶ Run Value Iteration";
                    statusBar.innerHTML = '❌ Error running Value Iteration.';
                });
        });
    }

    if (iterSlider) {
        iterSlider.addEventListener("input", function () {
            const idx = parseInt(iterSlider.value, 10);
            renderIteration(idx);
            updateIterLabel();
        });
    }

    if (playBtn) {
        playBtn.addEventListener("click", function () {
            if (playInterval) {
                clearInterval(playInterval);
                playInterval = null;
                playBtn.textContent = "▶";
                return;
            }

            iterSlider.value = 0;
            renderIteration(0);
            updateIterLabel();
            playBtn.textContent = "⏸";

            playInterval = setInterval(function () {
                let current = parseInt(iterSlider.value, 10);
                if (current >= iterationsData.length - 1) {
                    clearInterval(playInterval);
                    playInterval = null;
                    playBtn.textContent = "▶";
                    return;
                }
                current++;
                iterSlider.value = current;
                renderIteration(current);
                updateIterLabel();
            }, 200);
        });
    }

    function updateIterLabel() {
        const idx = parseInt(iterSlider.value, 10);
        iterLabel.textContent = (idx + 1) + " / " + iterationsData.length;
    }

    function renderIteration(idx) {
        const matrix = iterationsData[idx];
        if (!matrix) return;
        renderMatrixTable(
            valueMatrixEl,
            function (r, c) { return matrix[r][c].toFixed(2); },
            valueCellClass
        );
    }

    function renderPolicy() {
        if (!policyData || policyData.length === 0) return;
        renderMatrixTable(
            policyMatrixEl,
            function (r, c) {
                const sym = policyData[r][c];
                return sym === "■" ? "" : sym;
            },
            function (r, c) {
                let base = "policy-cell";
                if (isObstacle(r, c)) return base + " cell-obstacle";
                if (policyData[r][c] === "★") return base + " cell-end";
                if (startCell && parseInt(startCell.dataset.row, 10) === r && parseInt(startCell.dataset.col, 10) === c) return base + " cell-start";
                return base;
            }
        );
    }

    function renderPath() {
        if (!pathData || pathData.length === 0 || !pathSection) return;

        pathSection.style.display = "block";

        var pathSet = {};
        for (var i = 0; i < pathData.length; i++) {
            pathSet[pathData[i][0] + "," + pathData[i][1]] = i;
        }

        var startR = startCell ? parseInt(startCell.dataset.row, 10) : -1;
        var startC = startCell ? parseInt(startCell.dataset.col, 10) : -1;
        var endR = endCell ? parseInt(endCell.dataset.row, 10) : -1;
        var endC = endCell ? parseInt(endCell.dataset.col, 10) : -1;

        var html = '<table class="path-grid" style="grid-template-columns: repeat(' + n + ', 1fr);">';
        for (var r = 0; r < n; r++) {
            html += '<tr>';
            for (var c = 0; c < n; c++) {
                var key = r + "," + c;
                var cls = "pg-cell";
                var content = "";

                if (r === startR && c === startC) {
                    cls += " pg-start";
                    content = "S";
                } else if (r === endR && c === endC) {
                    cls += " pg-end";
                    content = "G";
                } else if (isObstacle(r, c)) {
                    cls += " pg-obstacle";
                    content = "■";
                } else if (policyData && policyData[r] && policyData[r][c] && policyData[r][c] !== '■') {
                    content = policyData[r][c];
                }

                if (pathSet.hasOwnProperty(key) && !(r === startR && c === startC) && !(r === endR && c === endC)) {
                    cls += " pg-path";
                }

                html += '<td class="' + cls + '">' + content + '</td>';
            }
            html += '</tr>';
        }
        html += '</table>';

        pathDisplay.innerHTML = html;

        var reached = pathData[pathData.length - 1];
        var success = (reached[0] === endR && reached[1] === endC);

        if (success) {
            pathInfo.innerHTML = '✅ Optimal path: <strong>' + (pathData.length - 1) + '</strong> steps &nbsp;|&nbsp; π*(s) = argmax<sub>a</sub> Σ p(s\'|s,a)[r + γV(s\')]';
        } else {
            pathInfo.innerHTML = '⚠️ No complete path found to the goal.';
        }
    }
});

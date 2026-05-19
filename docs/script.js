document.addEventListener("DOMContentLoaded", function () {
    const gridTitle = document.getElementById("grid-title");
    const grid = document.getElementById("grid");
    const statusBar = document.getElementById("status-bar");
    const obstacleCountEl = document.getElementById("obstacle-count");
    const maxObstaclesEl = document.getElementById("max-obstacles");
    const generateBtn = document.getElementById("generate-btn");
    const nInput = document.getElementById("n-input");
    const mainLayout = document.getElementById("main-layout");

    let n = 5;
    let maxObstacles = 3;
    let startCell = null;
    let endCell = null;
    let obstacles = [];

    const ACTION_KEYS = ["↑", "↓", "←", "→"];
    const ACTION_DELTA = { "↑": [-1, 0], "↓": [1, 0], "←": [0, -1], "→": [0, 1] };

    if (generateBtn) {
        generateBtn.addEventListener("click", function () {
            let val = parseInt(nInput.value, 10);
            if (isNaN(val) || val < 5 || val > 9) {
                alert("Please enter a number between 5 and 9.");
                return;
            }
            n = val;
            maxObstacles = n - 2;

            gridTitle.textContent = `HW1-1 | ${n} x ${n} Square`;
            maxObstaclesEl.textContent = maxObstacles;

            grid.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
            grid.innerHTML = "";
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    const cell = document.createElement("div");
                    cell.className = "cell";
                    cell.dataset.row = i;
                    cell.dataset.col = j;
                    cell.textContent = i * n + j + 1;
                    grid.appendChild(cell);
                }
            }

            startCell = null;
            endCell = null;
            obstacles = [];
            randomPolicy = null;
            document.getElementById("random-section").style.display = "none";
            document.getElementById("iteration-section").style.display = "none";
            document.getElementById("path-section").style.display = "none";
            const runPeBtn = document.getElementById("run-pe-btn");
            if (runPeBtn) runPeBtn.disabled = true;
            mainLayout.style.display = "flex";
            updateStatus();
        });
    }

    // ========== Grid Interaction ==========

    function updateStatus() {
        if (!startCell) {
            statusBar.innerHTML = 'Click a cell to set the <strong>start point</strong>.';
        } else if (!endCell) {
            statusBar.innerHTML = 'Click a cell to set the <strong>end point</strong>.';
        } else if (obstacles.length < maxObstacles) {
            const remaining = maxObstacles - obstacles.length;
            statusBar.innerHTML = `Click to place <strong>obstacles</strong> — ${remaining} remaining.`;
        } else {
            statusBar.innerHTML = '✅ All set! Start, end, and all obstacles are placed.';
        }
        obstacleCountEl.textContent = obstacles.length;
    }

    if (grid) {
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
                obstacles = obstacles.filter(o => o !== cell);
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
    }

    // ========== Shared helpers ==========

    function isObstacle(r, c) {
        return obstacles.some(o => parseInt(o.dataset.row, 10) === r && parseInt(o.dataset.col, 10) === c);
    }

    function obstacleSetKey(r, c) { return r + "," + c; }

    function buildObstacleSet() {
        return new Set(obstacles.map(o => obstacleSetKey(parseInt(o.dataset.row, 10), parseInt(o.dataset.col, 10))));
    }

    function getEndRC() {
        if (!endCell) return [-1, -1];
        return [parseInt(endCell.dataset.row, 10), parseInt(endCell.dataset.col, 10)];
    }

    function getStartRC() {
        if (!startCell) return [-1, -1];
        return [parseInt(startCell.dataset.row, 10), parseInt(startCell.dataset.col, 10)];
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
        const [sr, sc] = getStartRC();
        const [er, ec] = getEndRC();
        if (sr === r && sc === c) return "cell-start";
        if (er === r && ec === c) return "cell-end";
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

    function generateRandomPolicyJS() {
        const obstacleSet = buildObstacleSet();
        const [er, ec] = getEndRC();
        const policy = [];
        for (let r = 0; r < n; r++) {
            const row = [];
            for (let c = 0; c < n; c++) {
                if (obstacleSet.has(obstacleSetKey(r, c))) {
                    row.push("■");
                } else if (r === er && c === ec) {
                    row.push("★");
                } else {
                    row.push(ACTION_KEYS[Math.floor(Math.random() * 4)]);
                }
            }
            policy.push(row);
        }
        return policy;
    }

    function policyEvaluationJS(policy, gamma, rewardStep, rewardGoal) {
        const obstacleSet = buildObstacleSet();
        const [er, ec] = getEndRC();
        const maxIters = 500;
        const threshold = 1e-4;

        let V = Array(n).fill().map(() => Array(n).fill(0.0));
        let converged = false;
        let numIterations = maxIters;

        for (let it = 0; it < maxIters; it++) {
            let V_new = Array(n).fill().map(() => Array(n).fill(0.0));
            let delta = 0.0;

            for (let r = 0; r < n; r++) {
                for (let c = 0; c < n; c++) {
                    if (obstacleSet.has(obstacleSetKey(r, c))) {
                        V_new[r][c] = 0.0;
                        continue;
                    }
                    if (r === er && c === ec) {
                        V_new[r][c] = rewardGoal;
                        continue;
                    }

                    const sym = policy[r][c];
                    const delta_rc = ACTION_DELTA[sym];
                    if (!delta_rc) { V_new[r][c] = V[r][c]; continue; }
                    let nr = r + delta_rc[0], nc = c + delta_rc[1];
                    const offGrid = nr < 0 || nr >= n || nc < 0 || nc >= n;
                    const intoObstacle = !offGrid && obstacleSet.has(obstacleSetKey(nr, nc));
                    if (offGrid || intoObstacle) { nr = r; nc = c; }

                    V_new[r][c] = rewardStep + gamma * V[nr][nc];
                    delta = Math.max(delta, Math.abs(V_new[r][c] - V[r][c]));
                }
            }

            V = V_new;
            if (delta < threshold) {
                converged = true;
                numIterations = it + 1;
                break;
            }
        }

        return { V: V, converged: converged, num_iterations: numIterations };
    }

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
                const [sr, sc] = getStartRC();
                if (sr === r && sc === c) return base + " cell-start";
                return base;
            }
        );
    }

    function renderRandomValue(V) {
        renderMatrixTable(
            randomValueEl,
            function (r, c) { return V[r][c].toFixed(2); },
            valueCellClass
        );
    }

    if (genRandomBtn) {
        genRandomBtn.addEventListener("click", function () {
            if (!endCell) {
                statusBar.innerHTML = '⚠️ Please set the <strong>end point</strong> first.';
                return;
            }
            randomPolicy = generateRandomPolicyJS();
            randomSection.style.display = "block";
            renderRandomPolicy();
            randomValueEl.innerHTML = '<p class="placeholder">Click "Run Policy Evaluation" to compute V<sup>π</sup>(s).</p>';
            if (peStatus) peStatus.textContent = "";
            runPeBtn.disabled = false;
            statusBar.innerHTML = '🎲 Random policy generated. Now run Policy Evaluation.';
        });
    }

    if (runPeBtn) {
        runPeBtn.addEventListener("click", function () {
            if (!randomPolicy) {
                statusBar.innerHTML = '⚠️ Please generate a random policy first.';
                return;
            }
            if (!endCell) {
                statusBar.innerHTML = '⚠️ Please set the <strong>end point</strong> first.';
                return;
            }

            const gamma = parseFloat(document.getElementById("gamma-input").value) || 0.9;
            const rewardStep = parseFloat(document.getElementById("reward-step-input").value);
            const rewardGoal = parseFloat(document.getElementById("reward-goal-input").value);

            runPeBtn.disabled = true;
            runPeBtn.textContent = "⏳ Evaluating...";

            setTimeout(() => {
                const result = policyEvaluationJS(randomPolicy, gamma, rewardStep, rewardGoal);
                renderRandomValue(result.V);
                if (peStatus) {
                    peStatus.innerHTML =
                        (result.converged ? '✅ Converged' : '⚠️ Reached max iterations') +
                        ' in <strong>' + result.num_iterations + '</strong> sweeps · γ=' + gamma;
                }
                runPeBtn.disabled = false;
                runPeBtn.textContent = "▶ Run Policy Evaluation";
                statusBar.innerHTML = '✅ Policy Evaluation done in <strong>' + result.num_iterations + '</strong> sweeps.';
            }, 30);
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

    function runValueIterationJS(startR, startC, endR, endC, obstacleSet, gamma, rewardStep, rewardGoal) {
        const maxIters = 500;
        const threshold = 1e-4;

        let V = Array(n).fill().map(() => Array(n).fill(0.0));
        let iterations = [];
        iterations.push(JSON.parse(JSON.stringify(V)));

        let converged = false;
        let numIterations = maxIters;

        for (let it = 0; it < maxIters; it++) {
            let V_new = Array(n).fill().map(() => Array(n).fill(0.0));
            let delta = 0.0;

            for (let r = 0; r < n; r++) {
                for (let c = 0; c < n; c++) {
                    if (obstacleSet.has(obstacleSetKey(r, c))) {
                        V_new[r][c] = 0.0;
                        continue;
                    }
                    if (r === endR && c === endC) {
                        V_new[r][c] = rewardGoal;
                        continue;
                    }

                    let bestVal = -Infinity;
                    for (let a of ACTION_KEYS) {
                        const d = ACTION_DELTA[a];
                        let nr = r + d[0], nc = c + d[1];
                        const offGrid = nr < 0 || nr >= n || nc < 0 || nc >= n;
                        const intoObstacle = !offGrid && obstacleSet.has(obstacleSetKey(nr, nc));
                        if (offGrid || intoObstacle) { nr = r; nc = c; }
                        const val = rewardStep + gamma * V[nr][nc];
                        if (val > bestVal) bestVal = val;
                    }

                    V_new[r][c] = bestVal;
                    delta = Math.max(delta, Math.abs(V_new[r][c] - V[r][c]));
                }
            }

            V = V_new;
            iterations.push(JSON.parse(JSON.stringify(V)));

            if (delta < threshold) {
                converged = true;
                numIterations = it + 1;
                break;
            }
        }

        let policy = Array(n).fill().map(() => Array(n).fill(''));
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                if (obstacleSet.has(obstacleSetKey(r, c))) {
                    policy[r][c] = '■';
                    continue;
                }
                if (r === endR && c === endC) {
                    policy[r][c] = '★';
                    continue;
                }

                let bestVal = -Infinity;
                let bestAction = '↑';
                for (let a of ACTION_KEYS) {
                    const d = ACTION_DELTA[a];
                    let nr = r + d[0], nc = c + d[1];
                    const offGrid = nr < 0 || nr >= n || nc < 0 || nc >= n;
                    const intoObstacle = !offGrid && obstacleSet.has(obstacleSetKey(nr, nc));
                    if (offGrid || intoObstacle) { nr = r; nc = c; }
                    const val = rewardStep + gamma * V[nr][nc];
                    if (val > bestVal) { bestVal = val; bestAction = a; }
                }
                policy[r][c] = bestAction;
            }
        }

        let path = [];
        let currR = startR, currC = startC;
        path.push([currR, currC]);
        let steps = 0;
        while (!(currR === endR && currC === endC) && steps < n * n * 2) {
            let a = policy[currR][currC];
            if (!a || a === '■' || a === '★') break;
            const d = ACTION_DELTA[a];
            let nr = currR + d[0], nc = currC + d[1];
            const offGrid = nr < 0 || nr >= n || nc < 0 || nc >= n;
            const intoObstacle = !offGrid && obstacleSet.has(obstacleSetKey(nr, nc));
            if (offGrid || intoObstacle) break;
            if (nr === currR && nc === currC) break;
            currR = nr; currC = nc;
            path.push([currR, currC]);
            steps++;
        }

        return {
            iterations: iterations,
            policy: policy,
            converged: converged,
            num_iterations: numIterations,
            optimal_path: path
        };
    }

    if (runBtn) {
        runBtn.addEventListener("click", function () {
            if (!startCell || !endCell) {
                statusBar.innerHTML = '⚠️ Please set both <strong>start</strong> and <strong>end</strong> points first.';
                return;
            }

            const gamma = parseFloat(document.getElementById("gamma-input").value) || 0.9;
            const rewardStep = parseFloat(document.getElementById("reward-step-input").value);
            const rewardGoal = parseFloat(document.getElementById("reward-goal-input").value);

            const [startR, startC] = getStartRC();
            const [endR, endC] = getEndRC();
            const obstacleSet = buildObstacleSet();

            runBtn.disabled = true;
            runBtn.textContent = "⏳ Computing...";

            setTimeout(() => {
                const data = runValueIterationJS(startR, startC, endR, endC, obstacleSet, gamma, rewardStep, rewardGoal);

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

                statusBar.innerHTML = `✅ Value Iteration converged in <strong>${data.num_iterations}</strong> iterations.`;
            }, 50);
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
                return sym === '■' ? '' : sym;
            },
            function (r, c) {
                let base = "policy-cell";
                if (isObstacle(r, c)) return base + " cell-obstacle";
                if (policyData[r][c] === "★") return base + " cell-end";
                const [sr, sc] = getStartRC();
                if (sr === r && sc === c) return base + " cell-start";
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

        const [startR, startC] = getStartRC();
        const [endR, endC] = getEndRC();

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

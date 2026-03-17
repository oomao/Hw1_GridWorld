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

    if (generateBtn) {
        generateBtn.addEventListener("click", function () {
            let val = parseInt(nInput.value, 10);
            if (isNaN(val) || val < 5 || val > 9) {
                alert("Please enter a number between 5 and 9.");
                return;
            }
            n = val;
            maxObstacles = n - 2;

            gridTitle.textContent = `${n} x ${n} Square:`;
            maxObstaclesEl.textContent = maxObstacles;

            // Generate grid
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
            document.getElementById("iteration-section").style.display = "none";
            document.getElementById("path-section").style.display = "none";
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

    // ========== Value Iteration (Client-side JS implementation) ==========

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

    function runValueIterationJS(n, startR, startC, endR, endC, obstacleSet, gamma, rewardStep, rewardGoal) {
        const maxIters = 500;
        const threshold = 1e-4;

        let V = Array(n).fill().map(() => Array(n).fill(0.0));
        let iterations = [];
        iterations.push(JSON.parse(JSON.stringify(V)));

        const actions = { '↑': [-1, 0], '↓': [1, 0], '←': [0, -1], '→': [0, 1] };
        const actionKeys = ['↑', '↓', '←', '→'];

        let converged = false;
        let numIterations = maxIters;

        for (let it = 0; it < maxIters; it++) {
            let V_new = Array(n).fill().map(() => Array(n).fill(0.0));
            let delta = 0.0;

            for (let r = 0; r < n; r++) {
                for (let c = 0; c < n; c++) {
                    if (obstacleSet.has(`${r},${c}`)) {
                        V_new[r][c] = 0.0;
                        continue;
                    }
                    if (r === endR && c === endC) {
                        V_new[r][c] = rewardGoal;
                        continue;
                    }

                    let bestVal = -Infinity;
                    for (let a of actionKeys) {
                        let dr = actions[a][0], dc = actions[a][1];
                        let nr = r + dr, nc = c + dc;
                        if (nr < 0 || nr >= n || nc < 0 || nc >= n) {
                            nr = r; nc = c;
                        }
                        let val = rewardStep + gamma * V[nr][nc];
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
                if (obstacleSet.has(`${r},${c}`)) {
                    policy[r][c] = '■';
                    continue;
                }
                if (r === endR && c === endC) {
                    policy[r][c] = '★';
                    continue;
                }

                let bestVal = -Infinity;
                let bestAction = '↑';
                for (let a of actionKeys) {
                    let dr = actions[a][0], dc = actions[a][1];
                    let nr = r + dr, nc = c + dc;
                    if (nr < 0 || nr >= n || nc < 0 || nc >= n) {
                        nr = r; nc = c;
                    }
                    let val = rewardStep + gamma * V[nr][nc];
                    if (val > bestVal) {
                        bestVal = val;
                        bestAction = a;
                    }
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
            if (!a || a === '■') break;
            let dr = actions[a][0], dc = actions[a][1];
            let nr = currR + dr, nc = currC + dc;
            if (nr < 0 || nr >= n || nc < 0 || nc >= n) {
                nr = currR; nc = currC;
            }
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

            const startRow = parseInt(startCell.dataset.row, 10);
            const startCol = parseInt(startCell.dataset.col, 10);
            const endRow = parseInt(endCell.dataset.row, 10);
            const endCol = parseInt(endCell.dataset.col, 10);

            const obstacleSet = new Set(obstacles.map(o => `${o.dataset.row},${o.dataset.col}`));

            runBtn.disabled = true;
            runBtn.textContent = "⏳ Computing...";

            // Run VI synchronously (fast enough for our sizes)
            setTimeout(() => {
                const data = runValueIterationJS(n, startRow, startCol, endRow, endCol, obstacleSet, gamma, rewardStep, rewardGoal);

                iterationsData = data.iterations;
                policyData = data.policy;

                iterSlider.max = iterationsData.length - 1;
                iterSlider.value = 0;
                iterSection.style.display = "block";

                renderIteration(0);
                renderPolicy();
                updateIterLabel();

                // Render optimal path
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

        let html = '<table class="matrix-table">';
        html += '<tr><th></th>';
        for (let c = 0; c < n; c++) html += '<th>' + c + '</th>';
        html += '</tr>';

        for (let r = 0; r < n; r++) {
            html += '<tr><th>' + r + '</th>';
            for (let c = 0; c < n; c++) {
                let cls = "";
                if (startCell && parseInt(startCell.dataset.row, 10) === r && parseInt(startCell.dataset.col, 10) === c) {
                    cls = "cell-start";
                } else if (endCell && parseInt(endCell.dataset.row, 10) === r && parseInt(endCell.dataset.col, 10) === c) {
                    cls = "cell-end";
                } else if (isObstacle(r, c)) {
                    cls = "cell-obstacle";
                }
                html += '<td class="' + cls + '">' + matrix[r][c].toFixed(2) + '</td>';
            }
            html += '</tr>';
        }

        html += '</table>';
        valueMatrixEl.innerHTML = html;
    }

    function renderPolicy() {
        if (!policyData || policyData.length === 0) return;

        let html = '<table class="matrix-table">';
        html += '<tr><th></th>';
        for (let c = 0; c < n; c++) html += '<th>' + c + '</th>';
        html += '</tr>';

        for (let r = 0; r < n; r++) {
            html += '<tr><th>' + r + '</th>';
            for (let c = 0; c < n; c++) {
                let cls = "";
                if (isObstacle(r, c)) {
                    cls = "cell-obstacle";
                } else if (policyData[r][c] === "★") {
                    cls = "cell-end";
                }
                let policyChar = policyData[r][c] === '■' ? '' : policyData[r][c];
                html += '<td class="policy-cell ' + cls + '">' + policyChar + '</td>';
            }
            html += '</tr>';
        }

        html += '</table>';
        policyMatrixEl.innerHTML = html;
    }

    function isObstacle(r, c) {
        return obstacles.some(o => parseInt(o.dataset.row, 10) === r && parseInt(o.dataset.col, 10) === c);
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
            pathInfo.innerHTML = '✅ Optimal path: <strong>' + (pathData.length - 1) + '</strong> steps &nbsp;|&nbsp; π(s) = argmax<sub>a</sub> Σ p(s\'|s,a)[r + γV(s\')]';
        } else {
            pathInfo.innerHTML = '⚠️ No complete path found to the goal.';
        }
    }
});

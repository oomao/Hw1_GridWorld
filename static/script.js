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

    // ========== Value Iteration ==========

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

            const startRow = parseInt(startCell.dataset.row, 10);
            const startCol = parseInt(startCell.dataset.col, 10);
            const endRow = parseInt(endCell.dataset.row, 10);
            const endCol = parseInt(endCell.dataset.col, 10);

            const obstacleCoords = obstacles.map(function (o) {
                return [parseInt(o.dataset.row, 10), parseInt(o.dataset.col, 10)];
            });

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

                    // Render optimal path
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

        let html = '<table class="matrix-table">';

        // Header row (column indices)
        html += '<tr><th></th>';
        for (let c = 0; c < n; c++) {
            html += '<th>' + c + '</th>';
        }
        html += '</tr>';

        // Data rows (top-to-bottom, matching grid layout)
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

        // Header row
        html += '<tr><th></th>';
        for (let c = 0; c < n; c++) {
            html += '<th>' + c + '</th>';
        }
        html += '</tr>';

        // Data rows (top-to-bottom, matching grid layout)
        for (let r = 0; r < n; r++) {
            html += '<tr><th>' + r + '</th>';
            for (let c = 0; c < n; c++) {
                let cls = "";
                if (isObstacle(r, c)) {
                    cls = "cell-obstacle";
                } else if (policyData[r][c] === "★") {
                    cls = "cell-end";
                }
                html += '<td class="policy-cell ' + cls + '">' + policyData[r][c] + '</td>';
            }
            html += '</tr>';
        }

        html += '</table>';
        policyMatrixEl.innerHTML = html;
    }

    function isObstacle(r, c) {
        return obstacles.some(function (o) {
            return parseInt(o.dataset.row, 10) === r && parseInt(o.dataset.col, 10) === c;
        });
    }

    function renderPath() {
        if (!pathData || pathData.length === 0 || !pathSection) return;

        pathSection.style.display = "block";

        // Build a set of path coordinates for quick lookup
        var pathSet = {};
        for (var i = 0; i < pathData.length; i++) {
            pathSet[pathData[i][0] + "," + pathData[i][1]] = i;
        }

        var startR = startCell ? parseInt(startCell.dataset.row, 10) : -1;
        var startC = startCell ? parseInt(startCell.dataset.col, 10) : -1;
        var endR = endCell ? parseInt(endCell.dataset.row, 10) : -1;
        var endC = endCell ? parseInt(endCell.dataset.col, 10) : -1;

        // Build a visual mini-grid table
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
                } else if (policyData && policyData[r] && policyData[r][c]) {
                    content = policyData[r][c];
                }

                // Highlight if on the path (but not start/end)
                if (pathSet.hasOwnProperty(key) && !(r === startR && c === startC) && !(r === endR && c === endC)) {
                    cls += " pg-path";
                }

                html += '<td class="' + cls + '">' + content + '</td>';
            }
            html += '</tr>';
        }
        html += '</table>';

        pathDisplay.innerHTML = html;

        // Path info
        var reached = pathData[pathData.length - 1];
        var success = (reached[0] === endR && reached[1] === endC);

        if (success) {
            pathInfo.innerHTML = '✅ Optimal path: <strong>' + (pathData.length - 1) + '</strong> steps &nbsp;|&nbsp; π(s) = argmax<sub>a</sub> Σ p(s\'|s,a)[r + γV(s\')]';
        } else {
            pathInfo.innerHTML = '⚠️ No complete path found to the goal.';
        }
    }
});

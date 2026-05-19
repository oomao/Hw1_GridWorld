import random
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)


@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        n = request.form.get("n", default=5, type=int)
    else:
        n = request.args.get("n", default=5, type=int)
    if n < 5 or n > 9:
        n = 5
    max_obstacles = n - 2
    return render_template("grid.html", n=n, max_obstacles=max_obstacles)


# Actions: up, down, left, right
ACTIONS = [(-1, 0), (1, 0), (0, -1), (0, 1)]
ACTION_SYMBOLS = ["↑", "↓", "←", "→"]
SYMBOL_TO_DELTA = {"↑": (-1, 0), "↓": (1, 0), "←": (0, -1), "→": (0, 1)}


def _make_is_valid(n, obstacle_set):
    def is_valid(r, c):
        return 0 <= r < n and 0 <= c < n and (r, c) not in obstacle_set
    return is_valid


@app.route("/api/random-policy", methods=["POST"])
def random_policy():
    """HW1-2: generate a random action (↑↓←→) for every non-terminal, non-obstacle cell."""
    data = request.get_json()
    n = data["n"]
    end = tuple(data["end"])
    obstacles = [tuple(o) for o in data["obstacles"]]
    obstacle_set = set(obstacles)

    policy = [[""] * n for _ in range(n)]
    for r in range(n):
        for c in range(n):
            if (r, c) in obstacle_set:
                policy[r][c] = "■"
            elif (r, c) == end:
                policy[r][c] = "★"
            else:
                policy[r][c] = random.choice(ACTION_SYMBOLS)

    return jsonify({"policy": policy})


@app.route("/api/policy-evaluation", methods=["POST"])
def policy_evaluation():
    """HW1-2: evaluate V(s) for a given (random) deterministic policy via iterative policy evaluation.

    Bellman expectation equation for a deterministic policy π:
        V(s) = r(s, π(s)) + γ * V(s')
    """
    data = request.get_json()
    n = data["n"]
    end = tuple(data["end"])
    obstacles = [tuple(o) for o in data["obstacles"]]
    policy = data["policy"]  # 2D list of action symbols
    gamma = float(data.get("gamma", 0.9))
    reward_step = float(data.get("reward_step", -0.04))
    reward_goal = float(data.get("reward_goal", 1.0))

    obstacle_set = set(obstacles)
    is_valid = _make_is_valid(n, obstacle_set)

    V = [[0.0] * n for _ in range(n)]
    iterations_history = []
    max_iters = 500
    threshold = 1e-4
    converged = False
    num_iterations = max_iters

    for iteration in range(max_iters):
        V_new = [[0.0] * n for _ in range(n)]
        delta = 0.0

        for r in range(n):
            for c in range(n):
                if (r, c) in obstacle_set:
                    V_new[r][c] = 0.0
                    continue
                if (r, c) == end:
                    V_new[r][c] = reward_goal
                    continue

                symbol = policy[r][c]
                if symbol not in SYMBOL_TO_DELTA:
                    V_new[r][c] = V[r][c]
                    continue

                dr, dc = SYMBOL_TO_DELTA[symbol]
                nr, nc = r + dr, c + dc
                if not is_valid(nr, nc):
                    nr, nc = r, c  # bump into wall/obstacle → stay

                V_new[r][c] = reward_step + gamma * V[nr][nc]
                delta = max(delta, abs(V_new[r][c] - V[r][c]))

        V = V_new
        snapshot = [[round(V[r][c], 2) for c in range(n)] for r in range(n)]
        iterations_history.append(snapshot)

        if delta < threshold:
            converged = True
            num_iterations = iteration + 1
            break

    return jsonify({
        "iterations": iterations_history,
        "num_iterations": num_iterations,
        "converged": converged,
    })


@app.route("/api/value-iteration", methods=["POST"])
def value_iteration():
    """HW1-3: value iteration → optimal policy & V*(s)."""
    data = request.get_json()
    n = data["n"]
    start = tuple(data["start"])        # [row, col]
    end = tuple(data["end"])            # [row, col]
    obstacles = [tuple(o) for o in data["obstacles"]]
    gamma = float(data.get("gamma", 0.9))
    reward_step = float(data.get("reward_step", -0.04))
    reward_goal = float(data.get("reward_goal", 1.0))

    obstacle_set = set(obstacles)
    is_valid = _make_is_valid(n, obstacle_set)

    # Initialize value matrix
    V = [[0.0] * n for _ in range(n)]

    iterations_history = []
    max_iters = 500
    threshold = 1e-4

    for iteration in range(max_iters):
        V_new = [[0.0] * n for _ in range(n)]
        delta = 0.0

        for r in range(n):
            for c in range(n):
                if (r, c) in obstacle_set:
                    V_new[r][c] = 0.0
                    continue
                if (r, c) == end:
                    V_new[r][c] = reward_goal
                    continue

                best_val = float("-inf")
                for dr, dc in ACTIONS:
                    nr, nc = r + dr, c + dc
                    if not is_valid(nr, nc):
                        nr, nc = r, c  # stay in place
                    val = reward_step + gamma * V[nr][nc]
                    if val > best_val:
                        best_val = val

                V_new[r][c] = best_val
                delta = max(delta, abs(V_new[r][c] - V[r][c]))

        V = V_new

        # Round for display
        snapshot = [[round(V[r][c], 2) for c in range(n)] for r in range(n)]
        iterations_history.append(snapshot)

        if delta < threshold:
            break

    # Build policy matrix
    policy = [[""] * n for _ in range(n)]
    for r in range(n):
        for c in range(n):
            if (r, c) in obstacle_set:
                policy[r][c] = "■"
                continue
            if (r, c) == end:
                policy[r][c] = "★"
                continue

            best_val = float("-inf")
            best_action = ""
            for i, (dr, dc) in enumerate(ACTIONS):
                nr, nc = r + dr, c + dc
                if not is_valid(nr, nc):
                    nr, nc = r, c
                val = reward_step + gamma * V[nr][nc]
                if val > best_val:
                    best_val = val
                    best_action = ACTION_SYMBOLS[i]

            policy[r][c] = best_action

    # Trace optimal path from start to end
    path = [list(start)]
    current = start
    max_steps = n * n
    step = 0
    while current != end and step < max_steps:
        r, c = current
        direction = policy[r][c]
        if direction not in SYMBOL_TO_DELTA:
            break
        dr, dc = SYMBOL_TO_DELTA[direction]
        next_pos = (r + dr, c + dc)
        if not is_valid(next_pos[0], next_pos[1]):
            break
        current = next_pos
        path.append(list(current))
        step += 1

    return jsonify({
        "iterations": iterations_history,
        "policy": policy,
        "num_iterations": len(iterations_history),
        "converged": delta < threshold,
        "optimal_path": path
    })


if __name__ == "__main__":
    app.run(debug=True)

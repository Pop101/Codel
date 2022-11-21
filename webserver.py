from functools import wraps
from flask import Flask, render_template, request
from waitress import serve
from apscheduler.schedulers.background import BackgroundScheduler
from json import load
from random import choice
import requests
from re import sub, search, finditer, IGNORECASE
from time import time

app = Flask(__name__)

data = {
    "response": "OK",
    "result": {
        "solved": False,
        "time": 20,
        "errors": [
            {"line": 2},
            {"line": 1},
            {"line": 7},
        ],
        "error_message": "You have an error on line 2",
    },
}

language = dict()


@app.route("/submit", methods=["POST"])
def post_data():
    code = request.json["code"]
    code_with_boilerplate = language["boilerplate"].replace("%s", code)
    data = {
        "language": language["name"],
        "version": language["version"],
        "files": [{"name": language["filename"], "content": code_with_boilerplate}],
        "stdin": "",
        "args": [],
        "compile_timeout": 10000,
        "run_timeout": 3000,
        "compile_memory_limit": -1,
        "run_memory_limit": -1,
    }

    timestamp = time()
    resp = requests.post("https://emkc.org/api/v2/piston/execute", json=data).json()
    time_ellapsed = time() - timestamp

    # Search for line numbers in stderr
    line_nums = set()

    def append(match):
        try:
            line_nums.add(int(match.group(1)))
        except ValueError:
            pass

    for match in finditer(r"line\s+(\d+)", resp["run"]["stderr"], flags=IGNORECASE):
        append(match)
    for match in finditer(r"\((\d),\s*\d\)", resp["run"]["stderr"], flags=IGNORECASE):
        append(match)
    for match in finditer(r"(\d):\d", resp["run"]["stderr"], flags=IGNORECASE):
        append(match)

    # Remove any hints from the error message
    error = resp["run"]["stderr"]
    error = sub(r"(/)?piston/jobs/([\-A-Za-z0-9.]+)", "", error, flags=IGNORECASE)
    error = sub(r"(/)?piston/packages/([\-A-Za-z0-9.]+)([\s\"/:.,])*", "", error, flags=IGNORECASE)
    error = sub(r"(or <eof> at )?file[:\s/]*([\-A-Za-z0-9.]+)([\s\"/:.,])*", "", error, flags=IGNORECASE)
    error = sub(r"^(//|#|\%|/\*|\*).*$", "", error, flags=IGNORECASE)
    error = sub(r"error[:.,]", "", error, flags=IGNORECASE)
    error = sub(f"{language['filename']}([0-9:.,])*", "", error, flags=IGNORECASE)
    error = sub(f"{language['name']}([0-9:.,])*", "", error, flags=IGNORECASE)
    error = sub(f"{language['version']}([/0-9:.,A-Za-z])*", "", error)

    # Parse line numbers to be accurate with boilerplate
    lines_before = language["boilerplate"][: language["boilerplate"].find("%s")].count("\n") + 1
    line_nums = [x - lines_before for x in line_nums if x > lines_before]

    won = bool(search(r"hello world", resp["run"]["stdout"], flags=IGNORECASE))
    if len(line_nums) == 0 and not won:
        line_nums = list(range(1, code.count("\n") + 2))
    print("won:", won)
    print("line_nums:", line_nums)
    print("error:", error)

    return {
        "response": "OK",
        "result": {
            "solved": won,
            "time": int(time_ellapsed * 1000),
            "errors": [{"line": x, "message": f"Error on line {x}"} for x in line_nums],
            "error_message": error.encode("ascii", "ignore").decode("ascii").replace("\n", "<br />"),
        },
    }


@app.route("/", methods=["GET"])
def index():
    return render_template("index.html", language=language["name"].title())


def pick_language():
    global language
    with open("languages.json") as f:
        langs = load(f)

    language = choice(langs)


if __name__ == "__main__":
    pick_language()

    apsched = BackgroundScheduler()
    apsched.start()

    apsched.add_job(pick_language, "cron", day="*", hour="0")

    with app.test_client() as c:
        rv = c.post("/submit", json={"code": 'print "hello world"', "other": "data"})
        pass

    print("Starting server on port 8787")
    print(language)
    serve(app, host="0.0.0.0", port=8787)
    # app.run(debug=True)

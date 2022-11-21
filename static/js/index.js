$(document).ready(function () {
  $('.slick').slick();
});

const tgl_diag = (id) => {
  const diag = document.getElementById(id);
  const bg = document.getElementById("bg");
  if (diag.open) {
    diag.close();
    bg.style.opacity = "0";
    bg.style.pointerEvents = "none";
  } else {
    diag.show();
    bg.style.opacity = "1";
    bg.style.pointerEvents = "auto";
  }
}

let guess = 0;
let lock = false;
function executeCode() {
  if (lock) return;
  lock = true;

  const guess_elem = document.getElementById(`guess-${guess % 5 + 1}`);
  guess_elem.classList.add("inprogress");
  guess_elem.classList.remove("correct");
  guess_elem.classList.remove("incorrect");

  $.ajax({
    url: "/submit",
    type: "POST",
    data: JSON.stringify({ code: editor.getValue() }),
    success: (data) => {
      // Parse response
      const info = data.result;
      console.log(info)
      for (let i = 0; i < info.errors.length; i++) {
        let error = info.errors[i];
        setLineDecor(error.line - 1, "red");
      }

      guess_elem.classList.remove("inprogress");
      guess_elem.classList.add(info.solved ? "correct" : "incorrect");

      const errorDiv = info.error_message.length > 0 ? `<div class="tooltip"><code>${info.error_message}</code></div>` : "";
      guess_elem.innerHTML = `${info.time}ms${errorDiv}`;

      document.getElementById(`tries`).innerText = `${guess + 1}`;
      if (info.solved === true) win();
      else if (++guess == 5) lose();

      lock = false;
    },
    contentType: 'application/json',
  }).fail(function () {
    alert("Error: No connection to server");
  });
}

function lose() {
  tgl_diag("lose");
}

function win() {
  tgl_diag("win");
}

/*
Example Response
{
  "response": "OK",
  "result": {
    "solved": "false",
    "time": 20,
    "errors": [
      {
        "line": 2,
        "position": 10,
        "message": "Error 2:10"
      },
      {
        "line": 1,
        "position": 1,
        "message": "Error 1:1"
      },
      {
        "line": 7,
        "position": 20,
        "message": "Error 7:20"
      }
    ]
  }
}
*/
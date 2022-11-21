var editor;
var Range = ace.require('ace/range').Range;

window.addEventListener('load', () => {
    editor = ace.edit("editor");
    editor.setFontSize(16);
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/c_cpp"); // TODO: make combined highlighter for all languages


    editor.getSession().setAnnotations([{
        row: 1,
        column: 0,
        text: "Error Message", // Or the Json reply from the parser 
        type: "error" // also "warning" and "information"
    }]);

    // Move decorations with the code
    editor.getSession().on('change', function (e) {
        let start = e.start.row;
        let delta = e.end.row - e.start.row;
        if (e.action === "remove") delta = -delta;

        for (let line in { ...decor }) {
            // Move the decoration
            if (line > start && delta !== 0) {
                setLineDecor(parseInt(line) + delta, decor[line][1]);
                removeLineDecor(line);
            }
        }
    });

    // Change decorations when code is changed
    editor.getSession().on('change', function (e) {
        // Detect if the line was be changed
        let changed = true;

        // The line should only stay green if a newline was added to the end
        if (e.lines.every(ln => ln === '') && e.start.column === editor.session.getLine(e.start.row).length && e.end.column === 0)
            changed = true; // obv didn't work

        // Modify all lines
        for (let i = e.start.row; i <= e.end.row; i++) {
            if (changed && i in decor)
                setLineDecor(i, "grey");
        }
    });

    // Remove decorations when line is emptied
    editor.getSession().on('change', function (e) {
        for (let i = e.start.row; i <= e.end.row; i++) {
            if (editor.session.getLine(i).length === 0)
                removeLineDecor(i);
        }
    });
});

function returnToCheckpoint(id) {
    while (editor.session.getUndoManager().$undoStack.length > id) {
        editor.session.getUndoManager().undo();
    }
}

// Dict to map line number to decoration id
decor = {}
function setLineDecor(line, marker) {
    removeLineDecor(line);

    let marker_class = `lineMarker ${marker}`;
    let id = editor.session.addMarker(new Range(line, 0, line, 1), marker_class, "fullLine");
    editor.session.addGutterDecoration(line, marker_class);

    decor[line] = [id, marker_class];
}

function removeLineDecor(line) {
    if (line in decor) {
        let id = decor[line][0];
        let marker = decor[line][1];

        editor.session.removeMarker(id, marker);
        editor.session.removeGutterDecoration(line, marker);

        delete decor[line];
    }
}
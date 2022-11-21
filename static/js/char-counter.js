const maxChars = 256;

window.addEventListener('load', () => {
    // Char Counter
    document.getElementById("maxChars").textContent = maxChars;
    document.getElementById("chars").textContent = 0;


    editor.session.on('change', function (e) {
        document.getElementById("chars").textContent = editor.session.getValue().length
    });


    // Editor char hard limit
    // from https://github.com/ajaxorg/ace/issues/3393
    var doc = editor.session.doc;
    doc.$maxLength = maxChars;
    doc.applyAnyDelta = doc.applyAnyDelta || doc.applyDelta;
    doc.applyDelta = function (delta) {
        let joinedLines = delta.lines.join("\n");

        if (delta.action == "insert" && this.$maxLength
            && this.getValue().length + joinedLines.length > this.$maxLength) {

            let newPasteLength = this.$maxLength - this.getValue().length;
            if (newPasteLength > 0) {
                delta.lines = joinedLines.substr(0, newPasteLength).split("\n");
                if (delta.lines.length == 1 && delta.start.row == delta.end.row) {
                    delta.end = {
                        row: delta.start.row,
                        column: delta.start.column + newPasteLength
                    }
                } else {
                    delta.end = {
                        row: delta.start.row + delta.lines.length,
                        column: delta.lines[delta.lines.length - 1].length
                    }
                }
            } else return false;
        }
        return this.applyAnyDelta(delta);
    }
});
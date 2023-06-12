export default {
	table:function(clipboard){
		var data = [],
		headerFindSuccess = true,
		columns = this.table.columnManager.columns,
		columnMap = [],
		rows = [];

		//get data from clipboard into array of columns and rows.
		clipboard = clipboard.split("\n");
		console.log("clipboard", clipboard);

		clipboard.forEach(function(row){
			data.push(row.split("\t"));
		});
		console.log("data", data);

		// need to take the clipboard data and create an array of objects that with the selected cell column fields
		// mapped to the clipboard data
		

		if(data.length && !(data.length === 1 && data[0].length < 2) && this.table.modExists("selectCell") && this.table.options.selectableComponent === "cell"){
			const newValues = {};
			// const columnFields = this.table.modules.selectCell.selectedCells.map(
			// 	(cell) => {
			// 		return cell.column.definition.field;
			// 	}
			// );
			const columnPositions = {};
			this.table.modules.selectCell.selectedColumns.forEach(
				(column) => {
					columnPositions[this.table.columnManager.findColumnIndex(column)] = column.definition.field;
				}
			);
			Object.values(columnPositions).forEach(
				(field, index) => {
					this.table.modules.selectCell.selectedCells.forEach(
						(cell) => {
							if (cell.column.definition.field === field) {
								newValues[field] = data[0][index];
							}
						}
					);
				}
			);
			// this.table.modules.selectCell.selectedCells.forEach(
			// 	(cell) => {
			// 		newValues[cell.column.definition.field] = cell.getValue();
			// 	}
			// );
			console.log("newValues", newValues);
			const newRows = [];
			this.table.modules.selectCell.selectedRows.forEach(
				(row) => {
					const rowData = row.getData();
					newRows.push({...rowData, ...newValues});
				}
			);

			// // check if headers are present by title
			// data[0].forEach(function(value){
			// 	var column = columns.find(function(column){
			// 		return value && column.definition.title && value.trim() && column.definition.title.trim() === value.trim();
			// 	});
			// 	console.log("column", column);
			// 	if(column){
			// 		columnMap.push(column);
			// 	}else{
			// 		headerFindSuccess = false;
			// 	}
			// });

			// //check if column headers are present by field
			// if(!headerFindSuccess){
			// 	headerFindSuccess = true;
			// 	columnMap = [];

			// 	data[0].forEach(function(value){
			// 		var column = columns.find(function(column){
			// 			return value && column.field && value.trim() && column.field.trim() === value.trim();
			// 		});

			// 		if(column){
			// 			columnMap.push(column);
			// 		}else{
			// 			headerFindSuccess = false;
			// 		}
			// 	});

			// 	if(!headerFindSuccess){
			// 		columnMap = this.table.columnManager.columnsByIndex;
			// 	}
			// }

			// //remove header row if found
			// if(headerFindSuccess){
			// 	data.shift();
			// }

			// console.log("columnMap", columnMap);

			// data.forEach(function(item){
			// 	console.log("item", item);
			// 	var row = {};

			// 	item.forEach(function(value, i){
			// 		console.log("value", value);
			// 		console.log("i", i);
			// 		if(columnMap[i]){
			// 			row[columnMap[i].field] = value;
			// 		}
			// 	});

			// 	rows.push(row);
			// });
			console.log("final rows pasteParser", newRows);
			return newRows;
		}else{
			return false;
		}
	}
};

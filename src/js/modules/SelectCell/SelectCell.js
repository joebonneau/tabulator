import Module from '../../core/Module';

class SelectCell extends Module {
	constructor(table){
		super(table);

		this.cellComponent = null;
		this.selecting = false;
		this.lastClickedCell = null;
		this.selectPrev = []; // hold previously selected element for drag drop selection
		this.selectedCells = [];
		this.selectedRows = [];
		this.selectedColumns = [];

		// making these default table options
		// this.registerTableOption("selectableCells", "highlight"); // defines whether cells are selectable and how that functions
		// this.registerTableOption("selectableCellsRangeMode", "drag"); // defines how to select a range of cells
		// this.registerTableOption("selectableCellsRollingSelection", false); // defines whether the first cell should be deselected after a certain defined threshold
		// this.registerTableOption("selectableCellsPersistence", true); // defines whether the selection should be persisted when table view is updated
		// this.registerTableOption("selectableCellsCheck", function(data, cell){return true;}); // check whether a cell is selectable

		this.registerTableFunction("selectCell", this.selectCells.bind(this));
		this.registerTableFunction("deselectCell", this.deselectCells.bind(this));
		this.registerTableFunction("getSelectedCells", this.getSelectedCells.bind(this));
		// this.registerTableFunction("getSelectedCellsData", this.getSelectedCells.bind(this));

		this.registerComponentFunction("cell", "select", this.selectCells.bind(this));
		this.registerComponentFunction("cell", "deselect", this.deselectCells.bind(this));
		this.registerComponentFunction("cell", "toggleSelect", this.toggleCell.bind(this));
		this.registerComponentFunction("cell", "isSelected", this.isCellSelected.bind(this));
	}

	initialize(){
		if (this.table.options.selectable !== false && this.table.options.selectableComponent === "cell"){
			this.subscribe("cell-init", this.initializeCell.bind(this));
			this.subscribe("cell-delete", this.cellDeleted.bind(this));
			// this.subscribe("cells-wipe", this.clearSelectionData.bind(this));
			// this.subscribe("cells-retrieve", this.cellRetrieve.bind(this));
		}

		if(!this.table.options.selectablePersistence){
			this.subscribe("data-refreshing", this.deselectCells.bind(this));
		}
	}

	cellRetrieve(type, prevValue){
		return type === "selected" ? this.selectedCells : prevValue;
	}

	cellDeleted(cell){
		this._deselectCell(cell, true);
	}

	clearSelectionData(silent){
		const prevSelected = this.selectedCells.length;

		this.selecting = false;
		this.lastClickedCell = null;
		this.selectPrev = [];
		this.selectedCells = [];

		if(prevSelected && !silent){
			this._cellSelectionChanged();
		}
	}

	initializeCell(cell){
		const self = this,
		element = cell.getElement();

		// trigger end of cell selection
		const endSelect = function(){
			setTimeout(function(){
				self.selecting = false;
			}, 50);

			document.body.removeEventListener("mouseup", endSelect);
		};

		cell.modules.select = {selected:false};

		// set cell selection class
		if(self.checkCellSelectability(cell)){
			element.classList.add("tabulator-selectable");
			element.classList.remove("tabulator-unselectable");

			if(self.table.options.selectable && self.table.options.selectable !== "highlight"){
				if(self.table.options.selectableRangeMode === "click"){
					element.addEventListener("click", this.handleComplexCellClick.bind(this, cell));
				}else{
					element.addEventListener("click", function(e){
						if(!self.table.modExists("edit") || !self.table.modules.edit.getCurrentCell()){
							self.table._clearSelection();
						}
						if (!self.selecting){
							self.toggleCell(cell);
						}
					});

					element.addEventListener("mousedown", function(e){
						if(e.shiftKey){
							self.table._clearSelection();
							self.selecting = true;
							self.selectPrev = [];

							document.body.addEventListener("mouseup", endSelect);
							document.body.addEventListener("keyup", endSelect);

							self.toggleCell(cell);

							return false;
						}
						
						// append to selection on ctrl/cmd click
						if(e.ctrlKey || e.metaKey){
							self.selecting = true;
							self.toggleCell(cell);
						}
					});

					element.addEventListener("mouseenter", function(e){
						if(self.selecting){
							self.table._clearSelection();
							self.toggleCell(cell);
							
							if(self.selectPrev[1] === cell){
								self.toggleCell(self.selectPrev[0]);
							}
						}
					});
					
					element.addEventListener("mouseout", function(e){
						if(self.selecting){
							self.table._clearSelection();
							self.selectPrev.unshift(cell);
						}
					});

				}
			}
			// if(self.table.options.clipboard && self.table.modExists("clipboard")){
				
			// }
		}else{
			element.classList.add("tabulator-unselectable");
			element.classList.remove("tabulator-selectable");
		}
	}

	// SelectRow has this, not sure we need it here
	// handleComplexCellClick(cell, e){
	// }

	checkCellSelectability(cell){
		// if(cell !== undefined && cell !== null){
		// 	return this.table.options.selectableCellsCheck(this.table, cell.getComponent());
		// 	// return this.table.options.selectableCellsCheck(this.table, cell.getComponent());
		// }
		if(cell){
			return this.table.options.selectableCheck(this.table, cell.getComponent());
		}
		// if(cell && cell.type == "cell"){
		// 	return this.table.options.selectableCellsCheck(this.table, cell.getComponent());
		// }
		return false;
	}

	//toggle cell selection
	toggleCell(cell){
		if(this.checkCellSelectability(cell)){
			if(cell.modules.select && cell.modules.select.selected){
				this._deselectCell(cell);
			}else{
				this._selectCell(cell);
			}
		}
	}

	// select a number of cells
	selectCells(cells){
		const changes = [];
		let cellMatch = cells;
		let change;

		switch(typeof cells){
			case "undefined":
				cellMatch = this.table.cellManager.cells;
				break;
			case "string":
				cellMatch = this.table.cellManager.findCell(cells);
				if(!cellMatch){
					cellMatch = this.table.cellManager.findCells(cells);
				}
				break;
			default:
				break;
		}

		if(Array.isArray(cellMatch && cellMatch.length)){
			cellMatch.forEach((cell) => {
				change = this._selectCell(cell, true, true);
				if(change){
					changes.push(change);
				}
			});
			this._cellSelectionChanged(false, changes);
		}else if(cellMatch){
			this._selectCell(cellMatch, true, true);
		}
	}
	
	// select an individual cell
	_selectCell(cell, silent, force){
		// handle max cell count
		// TODO: revisit, not sure rolling selection is going to stay
		// if(
		// 	!isNaN(this.table.options.selectableCells) 
		// 	&& this.table.options.selectableCells !== true 
		// 	&& !force
		// 	&& this.selectedCells.length >= this.table.options.selectableCells
		// ){
		// 	if(this.table.options.selectableCellsRollingSelection){
		// 		this._deselectCell(this.selectedCells[0]);
		// 	}else{
		// 		return false;
		// 	}
		// }
		console.log("selectedCells", this.selectedCells);
		console.log("cell.column", cell.column);
		if(cell && this.selectedCells.indexOf(cell) === -1){
			cell.getElement().classList.add("tabulator-selected");
			if(!cell.modules.select){
				cell.modules.select = {};
			}

			cell.modules.select.selected = true;
			this.selectedCells.push(cell);
			if(!this.selectedRows.includes(cell.row)){
				console.log("pushing to selectedRows");
				this.selectedRows.push(cell.row);
			}
			if(!this.selectedColumns.includes(cell.column)){
				this.selectedColumns.push(cell.column);
			}
			console.log("selectedColumns", this.selectedColumns);
			console.log("selectedRows", this.selectedRows);

			this.dispatchExternal("cellSelected", cell.getComponent());
			this._cellSelectionChanged(silent, cell);
			return cell;
		} else if(!silent){
			console.warn(`Selection Error - No such cell found, ignoring selection: ${cell}`);
		}
	}

	isCellSelected(cell){
		return this.selectedCells.indexOf(cell) !== -1;
	}

	// deselect a number of cells
	deselectCells(cells, silent){
		const changes = [];
		let cellMatch = cells;
		let change;
		console.log("deselectCells", cells);
		console.log("typeof cells", typeof cells);
		switch(typeof cells){
			case "undefined":
				cellMatch = Object.assign([], this.selectedCells);
				break;
			case "string":
				cellMatch = this.table.cellManager.findCell(cells);
				if(!cellMatch){
					cellMatch = this.table.cellManager.findCells(cells);
				}
				break;
			default:
				break;
		}

		if(Array.isArray(cellMatch) && cellMatch.length){
			cellMatch.forEach((cell) => {
				change = this._deselectCell(cell, true);
				if(change){
					changes.push(change);
				}
			});
			// this.selectedRows = this.selectedCells.reduce((acc, cell) => {
			// 	if(!acc.includes(cell.row)){
			// 		acc.push(cell.row);
			// 	}
			// 	return acc;
			// }, []);
			// this.selectedColumns = this.selectedCells.reduce((acc, cell) => {
			// 	if(!acc.includes(cell.column)){
			// 		acc.push(cell.column);
			// 	}
			// 	return acc;
			// }, []);

			this._cellSelectionChanged(silent, [], changes);
		}else if(cellMatch){
			this._deselectCell(cellMatch, silent);
		}
	}

	// deselect an individual cell
	_deselectCell(cell, silent){
		const self = this;
		let index;
		let element;

		if(cell){
			index = self.selectedCells.findIndex(selectedCell => selectedCell === cell);

			if(index > -1){
				element = cell.getElement();
				if(element){
					element.classList.remove("tabulator-selected");
				}
				if(!cell.modules.select){
					cell.modules.select = {};
				}
				cell.modules.select.selected = false;
				self.selectedCells.splice(index, 1);
				self.selectedRows = self.selectedCells.reduce((acc, cell) => {
					if(!acc.includes(cell.row)){
						acc.push(cell.row);
					}
					return acc;
				}, []);
				self.selectedColumns = self.selectedCells.reduce((acc, cell) => {
					if(!acc.includes(cell.column)){
						acc.push(cell.column);
					}
					return acc;
				}, []);
				console.log("selectedColumns", self.selectedColumns);
				console.log("selectedRows", self.selectedRows);
				console.log("selectedCells", self.selectedCells);
				self.dispatchExternal("cellDeselected", cell.getComponent());
				self._cellSelectionChanged(silent, undefined, cell);

				return cell;
			}else if(!silent){
				console.warn(`Deselection Error - No such cell found, ignoring selection: ${cell}`);
			}
		}
	}

	getSelectedData(){
		console.log(this.selectedCells);
		return this.selectedCells.map(cell => cell.getData());
	}

	getSelectedCells(){
		return this.selectedCells.map(cell => cell.getComponent());
	}

	_cellSelectionChanged(silent, selected = [], deselected = []){
		if(!silent){
			if(!Array.isArray(selected)){
				selected = [selected];
			}
			selected = selected.map(cell => cell.getComponent());

			if(!Array.isArray(deselected)){
				deselected = [deselected];
			}
			deselected = deselected.map(cell => cell.getComponent());

			// this.dispatchExternal("cellSelectionChanged", this.getSelectedData(), this.getSelectedCells(), selected, deselected);
			this.dispatchExternal("cellSelectionChanged", this.getSelectedCells(), selected, deselected);
		}
	}

}

SelectCell.moduleName = "selectCell";
export default SelectCell;

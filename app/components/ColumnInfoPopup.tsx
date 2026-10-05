import { DatasetField } from "../../shared/models/Dataset";


interface ColumnInfoPopupProperties
{
	field: DatasetField | null;
	onClose: () => void;
}


export function ColumnInfoPopup({field, onClose}: ColumnInfoPopupProperties)
{
	if (!field)
		return null;


	return (
		<div className="popupBox vBox mdSpaceBox">
			<div className="popupPanel">
				<button
					className="popupCloseBtn"
					onClick={onClose}
				>
					X
				</button>

				<h1 id="columnInfoName">
					{field.name}
				</h1>

				<div className="vBox smSpaceBox">
					{field.info.map(item =>
						<div
							key={item.name}
							className="hBox lgSpaceBox spaceBetweenBox bottomLineBox"
						>
							<span>{item.name}</span>

							<span>{item.value}</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
import React, { useEffect, useState } from 'react'
import {
	Typography,
	Box,
	Button,
	Paper,
	TextField,
} from "@material-ui/core"
import { makeStyles } from '@material-ui/core/styles'
import { useSnackbar } from 'notistack'

import { useParams, useHistory } from 'react-router-dom'
import { BSON } from 'realm-web'

import { useRealmApp } from '../../App/RealmApp'
import { Finding, FindingData, FindingFieldName, FindingType, Priority, Status, Supplier, SupplierCall } from '../../../types'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import HistoryOverview from '../../utils/HistoryOverview'
import SupplierCalls from '../../utils/SupplierCalls'
import { catitaliseFirstLetter } from '../../utils'

const useStyles: any = makeStyles((theme) => ({
	optionListItem: {
		width: '100%',
	},
	button: {
		marginLeft: 10
	},
	formControl: {
		minWidth: 200
	},
	optionList: {
		width: '100%'
	},
	paperForForm: {
		width: '100%',
		padding: 20,
		marginBottom: 20,
	},
	marginBottom20: {
		marginBottom: 20
	},
	greyedOutText: {
		color: 'grey'
	},
}))

interface params {
	id: string
}

interface IProps {
}

const FindingDetailsSupplier: React.FC<IProps> = () => {
	const classes = useStyles()
	const app = useRealmApp()
	const history = useHistory()
	let { id } = useParams<params>()
	const mongo = app.currentUser.mongoClient("mongodb-atlas")
	const mongoFindingsCollection = mongo.db("RIVM_CONTRACTANT").collection("findings")
	const [finding, setFinding] = useState<Finding>()
	const [showHistory, setShowHistory] = useState<boolean>(false);
	const { enqueueSnackbar } = useSnackbar()

	const getData = async () => {
		try {
			let findingData = {
				description: "",
				status: Status.Open,
				type: FindingType.bug,
				priority: Priority.low,
				supplierCalls: [],
				supplier: Supplier.ivention,
				testDate: new Date(),
				history: []
			}
			if (id) {
				findingData = await mongoFindingsCollection.findOne({
					_id: new BSON.ObjectId(id)
				})
			}
			if (!findingData.status) findingData.status = Status.Open
			if (!findingData.testDate) findingData.testDate = new Date()
			setFinding(findingData)
		} catch (error) {
			enqueueSnackbar('Er is helaas iets mis gegaan bij het ophalen van de gegevens.', {
				variant: 'error',
			})
		}
	}

	useEffect(() => {
		getData()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const cancel = () => {
		history.goBack()
	}

	const save = async () => {
		try {
			if (id && finding) {
				const updatedFinding: Finding = {
					...finding
				}
				updatedFinding.lastUpdatedBySupplier = true
				delete updatedFinding._id
				const findingData: FindingData = {
					...updatedFinding
				}
				delete findingData.history
				updatedFinding.history.push({
					finding: findingData,
					createdOn: new Date(),
					createdBy: {
						_id: app.currentUser.id,
						email: app.currentUser.profile?.email || "Onbekend",
					}
				})
				await mongoFindingsCollection.updateOne({
					_id: new BSON.ObjectId(id)
				}, updatedFinding)
				enqueueSnackbar('De bevinding is aangepast.', {
					variant: 'success',
				})
			} else if (finding) {
				await mongoFindingsCollection.insertOne(finding)
				enqueueSnackbar('De nieuwe bevinding is aangemaakt.', {
					variant: 'success',
				})
			}
			history.push("/supplieroverview")
		} catch (error) {
			enqueueSnackbar('Er is helaas iets mis gegaan bij het opslaan van de bevinding.', {
				variant: 'error',
			})
		}
	}

	const updateCalls = (calls: SupplierCall[]) => {
		if (finding) {
			const newFinding: Finding = {
				...finding
			}
			newFinding.supplierCalls = calls
			setFinding(newFinding)
		}
	}

	const handleChangeTextField = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, fieldName: FindingFieldName) => {
		if (finding) {
			setFinding({
				...finding,
				[fieldName]: catitaliseFirstLetter(event.target.value)
			})
		}
	}

	return (
		<Box
			display="flex"
			width="100%"
			flexDirection="column"
			alignItems="flex-start"
			justifyContent="center"
			className={classes.dummy}
			p={2}
		>
			<Box
				display="flex"
				flexDirection="row"
				alignItems="center"
				justifyContent="space-between"
				width="100%"
				pb={5}
			>
				<Box
					display="flex"
					flexDirection="column"
					alignItems="flex-start"
					justifyContent="center"
				>
					<Typography variant="h4">Ticket{finding?.supplier && ` voor ${finding?.supplier}`}</Typography>
				</Box>
				<Box
					display="flex"
					flexDirection="row"
					alignItems="center"
					justifyContent="flex-end"
				>
					<Button variant="text" className={classes.button} onClick={cancel}>Annuleren</Button>
					<Button variant="contained" className={classes.button} color="primary" onClick={save}>
						Opslaan
					</Button>
				</Box>
			</Box>
			{!showHistory && <>
				<Paper className={classes.paperForForm}>
					<Box
						display="flex"
						flexDirection="row"
						alignItems="center"
						justifyContent="space-between"
						width="100%"
					>
						<Box
							display="flex"
							flexDirection="column"
							alignItems="flex-start"
							justifyContent="center"
							mb={2}
						>
							<Typography variant="caption">Testdatum: {finding?.testDate ? format(finding.testDate, 'Pp', { locale: nl }) : ""}</Typography>
							{finding?.userEmail && <Typography variant="caption">Opgevoerd door: {finding?.userEmail}</Typography>}
						</Box>
						<Box
							display="flex"
							flexDirection="row"
							alignItems="center"
							justifyContent="flex-end"
						>
							<Button variant="outlined" className={classes.button} onClick={() => setShowHistory(!showHistory)}>{showHistory ? 'Terug' : 'Toon historie'}</Button>
						</Box>
					</Box>
					<Box
						display="flex"
						flexDirection="column"
						alignItems="flex-start"
						justifyContent="center"
						width="100%"
						pb={3}
					>
						{finding?.description && <Typography variant="body1">Omschrijving: {finding?.description}</Typography>}
						{finding?.supplier && <Typography variant="body1">Leverancier: {finding?.supplier}</Typography>}
						{finding?.type && <Typography variant="body1">Type: {finding?.type}</Typography>}
						{finding?.priority && <Typography variant="body1">Prioriteit: {finding?.priority}</Typography>}
						{finding?.featureRequestDescription && <Typography variant="body1">Beschrijving van de verbetering: {finding?.featureRequestDescription}</Typography>}
						{finding?.featureRequestProposal && <Typography variant="body1">Oplossingsrichting: {finding?.featureRequestProposal}</Typography>}
						{finding?.informationRequestDescription && <Typography variant="body1">Vraag aan de leverancier: {finding?.informationRequestDescription}</Typography>}
						{finding?.theme && <Typography variant="body1">Thema: {finding?.theme}</Typography>}
						{finding?.expectedResult && <Typography variant="body1">Verwachte uitkomst: {finding?.expectedResult}</Typography>}
						{finding?.actualResult && <Typography variant="body1">Daadwerkelijke uitkomst: {finding?.actualResult}</Typography>}
						{finding?.additionalInfo && <Typography variant="body1">Extra informatie: {finding?.additionalInfo}</Typography>}
						{finding?.browser && <Typography variant="body1">Browser: {finding?.browser}</Typography>}
						{finding?.status && <Typography variant="body1">Status: {finding?.status}</Typography>}
					</Box>
					<Box
						display="flex"
						flexDirection="row"
						alignItems="center"
						justifyContent="flex-start"
						width="100%"
						mb={2}
					>
						<Typography variant="body2"><i>Eventuele screenshots zijn opgeslagen onder de volgende naam: </i></Typography>
					</Box>
					<Box
						display="flex"
						flexDirection="row"
						alignItems="center"
						justifyContent="flex-start"
						width="100%"
						mb={2}
					>
						<Typography variant="body2"><b>"{finding?.testDate ? format(finding.testDate, 'Pp', { locale: nl }) : ""} - {finding?.userEmail || 'onbekend'}"</b></Typography>
					</Box>
				</Paper>
				<Paper className={`${classes.paperForForm} ${classes.marginBottom20}`}>
					<SupplierCalls supplierCalls={finding?.supplierCalls || []} updateCalls={updateCalls}  />
				</Paper>
				<Paper className={classes.paperForForm}>
					<Box
						display="flex"
						flexDirection="row"
						alignItems="center"
						justifyContent="flex-start"
						width="100%"
						mb={1}
					>
						<Typography variant="h6">Terugkoppeling en status informatie</Typography>
					</Box>
					<Box
						display="flex"
						flexDirection="column"
						alignItems="flex-start"
						justifyContent="center"
						width="100%"
						pb={1}
					>
						{finding?.status && <Typography variant="body1">Status: {finding.status}</Typography>}
						{finding?.feedbackTeam && <Typography variant="body1">Terugkoppeling van het team: {finding.feedbackTeam}</Typography>}
						{finding?.feedbackProductOwner && <Typography variant="body1">Terugkoppeling van de product owner: {finding.feedbackProductOwner}</Typography>}
						{finding?.feedbackContractManagement && <Typography variant="body1">Terugkoppeling van contractmanagement: {finding.feedbackContractManagement}</Typography>}
						<Box
							display="flex"
							flexDirection="row"
							alignItems="center"
							justifyContent="center"
							width="100%"
							my={3}
						>
							<TextField
								label="Terugkoppeling vanuit de leverancier"
								value={finding?.feedbackSupplier || ''}
								multiline
								fullWidth
								variant="outlined"
								onChange={(event) => handleChangeTextField(event, FindingFieldName.feedbackSupplier)}
							/>
						</Box>
					</Box>
				</Paper>
			</>}
			{showHistory && finding?.history && <Paper className={classes.paperForForm}>
				<Box
					display="flex"
					flexDirection="row"
					alignItems="center"
					justifyContent="space-between"
					width="100%"
				>
					<Box
						display="flex"
						flexDirection="row"
						alignItems="center"
						justifyContent="flex-start"
						mb={2}
					>
						<Typography variant="caption">Testdatum: {finding?.testDate ? format(finding.testDate, 'Pp', { locale: nl }) : ""}</Typography>
					</Box>
					<Box
						display="flex"
						flexDirection="row"
						alignItems="center"
						justifyContent="flex-end"
					>
						<Button variant="outlined" className={classes.button} onClick={() => setShowHistory(!showHistory)}>{showHistory ? 'Terug' : 'Toon historie'}</Button>
					</Box>
				</Box>
				<HistoryOverview findingHistory={finding.history} />
			</Paper>}
		</Box>
	)
}

export default FindingDetailsSupplier

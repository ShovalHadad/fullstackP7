const chefRequestService =
  require("../services/chefRequestService");

/*
Submits a chef request for the authenticated user.
*/
const submitRequest = async (req, res, next) => {
  try {
    const request =
      await chefRequestService.submitRequest(
        req.user.userId,
        req.body
      );

    res.status(201).json({
      success: true,
      message: "Chef request submitted successfully",
      data: {
        request,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Returns the latest chef request of the authenticated user.
*/
const getMyRequest = async (req, res, next) => {
  try {
    const request =
      await chefRequestService.getMyRequest(
        req.user.userId
      );

    res.status(200).json({
      success: true,
      data: {
        request,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Returns chef requests to an administrator.

An optional status query parameter can be used:
GET /api/admin/chef-requests?status=pending
*/
const getAllRequests = async (req, res, next) => {
  try {
    const requests =
      await chefRequestService.getAllRequests(
        req.query.status
      );

    res.status(200).json({
      success: true,
      data: {
        requests,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Approves a chef request.
*/
const approveRequest = async (req, res, next) => {
  try {
    const request =
      await chefRequestService.approveRequest(
        Number(req.params.requestId),
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message: "Chef request approved successfully",
      data: {
        request,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Rejects a chef request.
*/
const rejectRequest = async (req, res, next) => {
  try {
    const request =
      await chefRequestService.rejectRequest(
        Number(req.params.requestId),
        req.user.userId,
        req.body.rejectionReason
      );

    res.status(200).json({
      success: true,
      message: "Chef request rejected successfully",
      data: {
        request,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitRequest,
  getMyRequest,
  getAllRequests,
  approveRequest,
  rejectRequest,
};